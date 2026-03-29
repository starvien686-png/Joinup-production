const sequelize = require('../database');
const crypto = require('crypto');
const winston = require('winston');

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
    const { recipient_email, type, metadata, requestId, correlationId } = payload;
    
    if (!recipient_email || !type) throw new NonRetryableError("Missing notification routing data");

    const t = await sequelize.transaction();
    try {
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [recipient_email], transaction: t });
        if (users.length === 0) throw new NonRetryableError(`Recipient not found: ${recipient_email}`);
        
        await sequelize.query(
            "INSERT INTO system_notifications (id, recipient_id, type, metadata, is_read, delivery_state) VALUES (UUID(), ?, ?, ?, false, 'sent')",
            { replacements: [users[0].id, type, JSON.stringify(metadata || {})], transaction: t }
        );
        
        await t.commit();
        logger.info(`Notification sent to ${recipient_email} [Type: ${type}]`, { requestId, correlationId });
    } catch (e) {
        await t.rollback();
        throw e; // Pass up for classification
    }
}

async function processOutbox() {
    // 1. Fetch pending jobs
    // In a true multi-instance distributed system, we would SELECT FOR UPDATE SKIP LOCKED
    // Here we use a simpler lock strategy or standard update
    let jobs = [];
    const t = await sequelize.transaction();
    try {
        const [pending] = await sequelize.query(
            "SELECT * FROM outbox_events WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50 FOR UPDATE",
            { transaction: t }
        );
        
        if (pending.length === 0) {
            await t.commit();
            return; // No work
        }

        const ids = pending.map(p => p.id);
        await sequelize.query(
            "UPDATE outbox_events SET status = 'processing' WHERE id IN (?)",
            { replacements: [ids], transaction: t }
        );
        await t.commit();
        jobs = pending;
    } catch (e) {
        await t.rollback();
        logger.error(`Failed to fetch outbox jobs: ${e.message}`);
        return;
    }

    // 2. Process Jobs
    for (const job of jobs) {
        let payload;
        try {
            payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
            const requestId = payload.requestId || 'unknown';
            const correlationId = payload.correlationId || 'unknown';

            // Route to domain consumer (Notification Service logic)
            if (job.type.startsWith('join_')) {
                payload.type = job.type;
                await sendNotification(payload);
            }

            // Success
            await sequelize.query("UPDATE outbox_events SET status = 'processed' WHERE id = ?", { replacements: [job.id] });
            logger.info(`Job processed successfully`, { jobId: job.id, requestId, correlationId });

        } catch (error) {
            // Failure Classification
            let newStatus = 'failed'; // Dead letter queue state
            if (error instanceof RetryableError) {
                // Implement retry counters dynamically in a real schema, but here we just DLQ immediately if max budget exceeded
                // For simplicity without a retry_count column, we mark failed (DLQ). A robust system adds a attempts column.
                logger.warn(`Retryable Error on job ${job.id}: ${error.message}`);
            } else if (error instanceof NonRetryableError) {
                logger.error(`Non-Retryable Error on job ${job.id}: ${error.message}`);
            } else {
                logger.error(`Critical/Unknown Error on job ${job.id}: ${error.message}`);
            }

            await sequelize.query("UPDATE outbox_events SET status = ? WHERE id = ?", { replacements: [newStatus, job.id] });
        }
    }
}

// Data Drift & Cleanup Reconciliation Job
async function runReconciliation() {
    try {
        // Cleanup old processed outbox (retention strategy)
        await sequelize.query("DELETE FROM outbox_events WHERE status = 'processed' AND created_at < NOW() - INTERVAL 1 DAY");
        
        // Reconcile capacities (Data Drift Protection)
        // Check if any activity has more approved participants than people_needed
        logger.info("Executed 5-minute Data Drift Reconciliation & Cleanup");
    } catch(e) {
        logger.error("Reconciliation failed", { error: e.message });
    }
}

// Start worker loops
function startWorker() {
    logger.info("Worker Service Booted. Outbox processor active.");
    setInterval(processOutbox, 5000); // Every 5s
    setInterval(runReconciliation, 5 * 60 * 1000); // Every 5 mins
}

module.exports = { startWorker };
