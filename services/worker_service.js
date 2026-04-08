const sequelize = require('../database');
const crypto = require('crypto');
const winston = require('winston');
const pushService = require('./push_service');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/worker_service.log' }),
        new winston.transports.Console()
    ]
});

// Explicit Failure Classification Model
class RetryableError extends Error {
    constructor(message) { super(message); this.name = 'RetryableError'; }
}
class NonRetryableError extends Error {
    constructor(message) { super(message); this.name = 'NonRetryableError'; }
}

const MAX_RETRIES = 5; // Global Event Budget per event_id/job_type

async function sendNotification(payload) {
    const { recipient_email, type, aggregate_id, link, action_metadata, metadata, requestId, correlationId } = payload;
    
    if (!recipient_email || !type) throw new NonRetryableError("Missing notification routing data");

    const t = await sequelize.transaction();
    try {
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [recipient_email], transaction: t });
        if (users.length === 0) throw new NonRetryableError(`Recipient not found: ${recipient_email}`);
        
        const recipient_id = users[0].id;

        // Actionable V1 Schema Support
        await sequelize.query(
            `INSERT INTO system_notifications (id, recipient_id, type, aggregate_id, link, metadata, action_metadata, is_read, delivery_state, created_at) 
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, false, 'delivered', NOW())
             ON DUPLICATE KEY UPDATE delivery_state = 'delivered'`,
            { 
                replacements: [
                    recipient_id, type, aggregate_id || null, link || null, 
                    JSON.stringify(metadata || {}), JSON.stringify(action_metadata || {}),
                ], 
                transaction: t 
            }
        );
        
        await t.commit();
        logger.info(`Notification sent to ${recipient_email} [Type: ${type}]`, { requestId, correlationId });

        // 🔔 OneSignal Push Integration
        if (type === 'ACCEPTED' || type === 'REJECTED') {
            const eventTitle = metadata?.event_title || 'Event';
            const pushTitle = type === 'ACCEPTED' ? '🎉 Join Request Approved / 報名成功！' : '❌ Join Request Declined / 報名未通過';
            const pushBody = type === 'ACCEPTED' 
                ? `Your request for "${eventTitle}" was accepted! / 您對「${eventTitle}」的加入申請已獲批准！快來看看細節。`
                : `Your request for "${eventTitle}" was not accepted. / 您對「${eventTitle}」的加入申請已被婉拒。`;
            
            // Ensure URL uses hash routing (#) for SPA compatibility to avoid 404 errors
            let cleanLink = link ? (link.startsWith('/') ? link.substring(1) : link) : 'home';
            const targetLink = `https://joinup-production.onrender.com/#${cleanLink}`;
            await pushService.sendPushNotification([recipient_email], pushTitle, pushBody, targetLink);
        }
    } catch (e) {
        if (t) await t.rollback();
        throw e;
    }
}

async function processOutbox() {
    let jobs = [];
    const t = await sequelize.transaction();
    try {
        const [pending] = await sequelize.query(
            "SELECT * FROM outbox_events WHERE status IN ('pending', 'retrying') AND retry_count < ? ORDER BY created_at ASC LIMIT 50 FOR UPDATE",
            { replacements: [MAX_RETRIES], transaction: t }
        );
        
        if (pending.length === 0) {
            await t.commit();
            return;
        }

        const ids = pending.map(p => p.id);
        await sequelize.query(
            "UPDATE outbox_events SET status = 'processing', last_attempt_at = NOW() WHERE id IN (?)",
            { replacements: [ids], transaction: t }
        );
        await t.commit();
        jobs = pending;
    } catch (e) {
        if (t) await t.rollback();
        logger.error(`Failed to fetch outbox jobs: ${e.message}`);
        return;
    }

    for (const job of jobs) {
        let payload;
        try {
            payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
            const requestId = payload.requestId || 'unknown';
            
            // Notification routing
            if (job.type.startsWith('join_')) {
                // Map to standardized types for frontend translation
                if (job.type === 'join_approved') payload.type = 'ACCEPTED';
                else if (job.type === 'join_rejected') payload.type = 'REJECTED';
                else payload.type = job.type;
                payload.aggregate_id = job.aggregate_id;
                // Map actionable metadata
                if (payload.actionType) {
                    payload.action_metadata = { actionType: payload.actionType, targetId: payload.targetId };
                    payload.link = 'home'; // Simplified for OneSignal URL
                }
                
                // UX: Pass profile snapshots into persistent metadata
                payload.metadata = {
                    event_id: payload.event_id || payload.targetId,
                    user_email: payload.user_email,
                    event_type: payload.event_type,
                    event_title: payload.event_title,
                    snapshot_display_name: payload.snapshot_display_name,
                    snapshot_avatar_url: payload.snapshot_avatar_url,
                    snapshot_bio: payload.snapshot_bio
                };

                await sendNotification(payload);
            }

            await sequelize.query("UPDATE outbox_events SET status = 'processed', error_message = NULL WHERE id = ?", { replacements: [job.id] });
            logger.info(`Job processed successfully`, { jobId: job.id, requestId });

        } catch (error) {
            const isRetryable = !(error instanceof NonRetryableError);
            const nextRetryCount = job.retry_count + 1;
            
            if (nextRetryCount >= MAX_RETRIES) {
                // PUSH TO DLQ
                await sequelize.query(
                    `INSERT INTO dead_letter_queue (id, original_event_id, idempotency_key, aggregate_type, aggregate_id, type, payload, error_message, failed_at) 
                     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    { replacements: [job.id, job.idempotency_key, job.aggregate_type, job.aggregate_id, job.type, job.payload, error.message] }
                );
                await sequelize.query("UPDATE outbox_events SET status = 'failed', error_message = ? WHERE id = ?", { replacements: [error.message, job.id] });
                logger.error(`Job ${job.id} moved to DLQ after ${nextRetryCount} attempts: ${error.message}`);
            } else {
                const nextStatus = isRetryable ? 'retrying' : 'failed';
                await sequelize.query(
                    "UPDATE outbox_events SET status = ?, retry_count = ?, error_message = ? WHERE id = ?", 
                    { replacements: [nextStatus, nextRetryCount, error.message, job.id] }
                );
                logger.warn(`Job ${job.id} failed (attempt ${nextRetryCount}): ${error.message}`);
            }
        }
    }
}

// Data Drift & Cleanup Reconciliation Job
async function runReconciliation() {
    try {
        // 1. Reset stuck jobs (processing for > 5 mins)
        await sequelize.query(
            "UPDATE outbox_events SET status = 'retrying' WHERE status = 'processing' AND last_attempt_at < NOW() - INTERVAL 5 MINUTE"
        );
        
        // 2. Cleanup old processed outbox
        await sequelize.query("DELETE FROM outbox_events WHERE status = 'processed' AND created_at < NOW() - INTERVAL 7 DAY");
        
        logger.info("Executed Outbox Reconciliation & Cleanup");
    } catch(e) {
        logger.error("Reconciliation failed", { error: e.message });
    }
}

// Start worker loops
function startWorker() {
    logger.info("Worker Service Booted. Outbox processor active.");
    setInterval(processOutbox, 2000); // Faster polling (2s) for "Immediate" feel
    setInterval(runReconciliation, 5 * 60 * 1000); // Every 5 mins
}

module.exports = { startWorker };
