const express = require('express');
const router = express.Router();
const sequelize = require('../database');
const crypto = require('crypto');
const winston = require('winston');
const pushService = require('./push_service');
const { awardViolationPoint } = require('./points_service');


const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/join_service.log' }),
        new winston.transports.Console()
    ]
});

// 1. Helper: Domain mapping to Table Name
function getTableName(category) {
    const mapping = {
        'sports': 'activities',
        'carpool': 'carpools',
        'study': 'studies',
        'hangout': 'hangouts',
        'housing': 'housing',
        'groupbuy': 'housing'
    };
    // Hangout sub-categories all map to the 'hangouts' table
    const hangoutSubCategories = ['travel', 'food', 'Food', 'Outdoor', 'Arts', 'Entertainment', 'Shopping', 'Sports', 'Nightlife'];
    if (hangoutSubCategories.includes(category)) return 'hangouts';
    return mapping[category] || 'activities';
}

// 1.1 Helper: Column mappings for different event types
function getCapacityColumn(category) {
    if (category === 'housing') return null;
    return category === 'carpool' ? 'available_seats' : 'people_needed';
}

const getEmailVariations = (email) => {
    if (!email) return [];
    if (email.endsWith('@mail1.ncnu.edu.tw')) return [email, email.replace('@mail1.ncnu.edu.tw', '@ncnu.edu.tw')];
    if (email.endsWith('@ncnu.edu.tw')) return [email, email.replace('@ncnu.edu.tw', '@mail1.ncnu.edu.tw')];
    return [email];
};

function getTimeColumn(category) {
    return category === 'carpool' ? 'departure_time' : 'event_time';
}

// 2. Idempotency DB-backed middleware
async function withIdempotency(req, res, next) {
    req.requestId = crypto.randomUUID();
    req.correlationId = req.headers['x-correlation-id'] || req.requestId;

    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!idempotencyKey || req.method === 'GET') return next();

    try {
        const [records] = await sequelize.query(
            'SELECT request_hash, response_snapshot, expires_at FROM request_idempotency WHERE idempotency_key = ?',
            { replacements: [idempotencyKey] }
        );

        const currentHash = crypto.createHash('sha1').update(JSON.stringify(req.body)).digest('hex');

        if (records.length > 0) {
            const stored = records[0];
            if (new Date() > new Date(stored.expires_at)) {
                await sequelize.query('DELETE FROM request_idempotency WHERE idempotency_key = ?', { replacements: [idempotencyKey] });
            } else if (stored.request_hash !== currentHash) {
                return res.status(409).json({
                    errorCode: 'IDEMPOTENCY_CONFLICT',
                    message: 'Idempotency key reused with different payload',
                    requestId: req.requestId
                });
            } else {
                return res.status(200).json(JSON.parse(stored.response_snapshot));
            }
        }

        req.idempotencyKey = idempotencyKey;
        req.requestHash = currentHash;

        const originalJson = res.json;
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300 && req.idempotencyKey) {
                const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins TTL
                sequelize.query(
                    'INSERT INTO request_idempotency (idempotency_key, request_hash, response_snapshot, expires_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE expires_at = ?',
                    { replacements: [req.idempotencyKey, req.requestHash, JSON.stringify(body), expiresAt, expiresAt] }
                ).catch(err => logger.error('Failed to save idempotency:', err));
            }
            return originalJson.call(this, body);
        };
        next();
    } catch (err) {
        logger.error('Idempotency middleware error:', err);
        next();
    }
}

// 3. Timeout middleware (5s bound)
function withTimeout(req, res, next) {
    const timeout = 5000;
    res.setTimeout(timeout, () => {
        if (!res.headersSent) {
            res.status(408).json({
                errorCode: 'REQUEST_TIMEOUT',
                message: 'Request execution time exceeded 5s limit.',
                requestId: req.requestId
            });
        }
    });
    next();
}

router.use(withTimeout);
router.use(withIdempotency);

// --- ENDPOINTS ---

// 1. POST /api/v1/join
router.post('/join', async (req, res) => {
    const { event_type, event_id, user_email } = req.body;
    if (!event_type || !event_id || !user_email) {
        return res.status(400).json({ errorCode: 'MISSING_FIELDS', message: 'Missing fields', requestId: req.requestId });
    }

    let t;
    try {
        t = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });

        const [users] = await sequelize.query(
            'SELECT id, username, profile_pic, bio FROM users WHERE email = ?',
            { replacements: [user_email], transaction: t }
        );
        if (users.length === 0) throw { status: 404, errorCode: 'USER_NOT_FOUND', message: 'User not found' };

        const user = users[0];
        const snapshot_display_name = user.username;
        const snapshot_avatar_url = user.profile_pic;
        const snapshot_bio = user.bio;
        const user_id = user.id;

        const tableName = getTableName(event_type);
        const capacityCol = getCapacityColumn(event_type);
        const timeCol = getTimeColumn(event_type);

        const [events] = await sequelize.query(
            `SELECT title, status, host_email, ${capacityCol} as capacity, deadline, 
             ${(event_type === 'housing' || event_type === 'groupbuy') ? 'deadline' : timeCol} as start_time 
             FROM ${tableName} WHERE id = ? FOR UPDATE`,
            { replacements: [event_id], transaction: t }
        );
        if (events.length === 0) throw { status: 404, errorCode: 'EVENT_NOT_FOUND', message: 'Event not found' };

        const event = events[0];
        const event_title = event.title;
        if (event.status !== 'open' && event.status !== 'active') {
            throw { status: 400, errorCode: 'EVENT_LOCKED', message: 'Event is no longer open for registration' };
        }

        const deadline = event.deadline || event.start_time;
        if (deadline && new Date(deadline) < new Date()) {
            throw { status: 400, errorCode: 'EVENT_CLOSED', message: 'Registration deadline has passed' };
        }
        if (event.host_email === user_email) {
            throw { status: 400, errorCode: 'SELF_JOIN_FORBIDDEN', message: 'Host cannot join their own event' };
        }

        const [approved] = await sequelize.query(
            "SELECT COUNT(*) as count FROM event_participants WHERE event_type = ? AND event_id = ? AND status = 'approved' FOR UPDATE",
            { replacements: [event_type, event_id], transaction: t }
        );

        // --- CAPACITY CHECK ---
        const approvedCount = parseInt(approved[0].count, 10);
        // Host-Inclusive Rule: Host is included in the total capacity for all modules.
        // The DB count (approvedCount) already includes the auto-joined host.
        const currentCount = approvedCount;

        if (currentCount >= event.capacity) {
            throw { status: 409, errorCode: 'EVENT_FULL', message: 'Event has reached maximum capacity' };
        }

        const [parts] = await sequelize.query(
            "SELECT id, status FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = ? FOR UPDATE",
            { replacements: [event_type, event_id, user_id], transaction: t }
        );

        if (parts.length > 0) {
            const current = parts[0];
            if (['pending', 'approved'].includes(current.status)) {
                throw { status: 400, errorCode: 'ALREADY_APPLIED', message: `Already applied. Status: ${current.status}` };
            }
            await sequelize.query(
                `UPDATE event_participants 
                 SET status = 'pending', version = version + 1, 
                     snapshot_display_name = ?, snapshot_avatar_url = ?, snapshot_bio = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                { replacements: [snapshot_display_name, snapshot_avatar_url, snapshot_bio, current.id], transaction: t }
            );
        } else {
            await sequelize.query(
                `INSERT INTO event_participants 
                 (event_type, event_id, user_id, status, snapshot_display_name, snapshot_avatar_url, snapshot_bio, created_at, updated_at) 
                 VALUES (?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())`,
                { replacements: [event_type, event_id, user_id, snapshot_display_name, snapshot_avatar_url, snapshot_bio], transaction: t }
            );
        }

        await sequelize.query(
            `INSERT INTO audit_logs (id, actor_id, event_id, action, new_state, request_id, timestamp) 
             VALUES (UUID(), ?, ?, 'JOIN_REQUEST', 'pending', ?, NOW())`,
            { replacements: [user_id, event_id, req.requestId], transaction: t }
        );

        const outboxPayload = JSON.stringify({
            recipient_email: event.host_email,
            event_type, event_id, user_email,
            snapshot_display_name, snapshot_avatar_url, snapshot_bio,
            event_title,
            actionType: 'OPEN_REVIEW_MODAL',
            targetId: event_id,
            version: '1'
        });
        await sequelize.query(
            `INSERT INTO outbox_events (id, idempotency_key, aggregate_type, aggregate_id, type, payload, created_at) 
             VALUES (UUID(), ?, 'participant', ?, 'join_request', ?, NOW())`,
            { replacements: [req.idempotencyKey || req.requestId, `join_${event_type}_${event_id}_${user_id}`, outboxPayload], transaction: t }
        );

        await t.commit();

        try {
            const hostEmail = event.host_email;
            const normalizedHostEmail = hostEmail.toLowerCase().trim();
            const pushTitle = `🚀 New Participant Request / 新成員加入申請`;
            const pushBody = `There is a new participant request for your event ("${event_title}"). Open the app to confirm! / 叮咚！有新夥伴想加入你的活動「${event_title}」，趕快打開 App 看看吧！`;

            const category = event_type === 'sports' ? 'sports' : (event_type === 'carpool' ? 'carpool' : (event_type === 'study' ? 'study' : 'travel'));
            pushService.sendPushNotification([hostEmail], pushTitle, pushBody, `https://joinup-production.onrender.com/#${category}`);

            const io = req.app.get('io');
            if (io) {
                const hostRoom = `user_${normalizedHostEmail}`;
                io.to(hostRoom).emit('join_request', {
                    event_type,
                    event_id,
                    event_title,
                    applicant_name: snapshot_display_name,
                    applicant_email: user_email,
                    message: pushBody
                });
                console.log(`[Socket] Targeted join_request emitted to: ${hostRoom}`);
            }

            console.log(`[Notification] Join request push sent to Host: ${hostEmail} / 成功發送加入通知給發起人: ${hostEmail}`);
        } catch (pushErr) {
            console.error(`[Notification] Failed to send push to Host: / 哎呀，發送推播給主辦人失敗：`, pushErr.message);
        }

        res.status(202).json({ success: true, message: 'Join request pending approval', data: { status: 'pending' }, requestId: req.requestId });
    } catch (err) {
        if (t) await t.rollback();
        res.status(err.status || 500).json({ success: false, errorCode: err.errorCode || 'INTERNAL_ERROR', message: err.message, requestId: req.requestId });
    }
});

// 2. POST /api/v1/join/cancel
router.post('/join/cancel', async (req, res) => {
    const { event_type, event_id, user_email } = req.body;
    if (!event_type || !event_id || !user_email) return res.status(400).json({ success: false, message: 'Missing fields' });

    let t;
    try {
        t = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [user_email], transaction: t });
        if (users.length === 0) throw { status: 404, message: 'User not found' };
        const user_id = users[0].id;

        const [parts] = await sequelize.query(
            "SELECT id, status FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = ? FOR UPDATE",
            { replacements: [event_type, event_id, user_id], transaction: t }
        );
        if (parts.length === 0) throw { status: 404, message: 'No request exists' };

        if (parts[0].status === 'approved') {
            // --- DROPPING FROM APPROVED EVENT ---
            const approvalTime = parts[0].updated_at;
            const now = new Date();
            const minsSinceApproval = (now - new Date(approvalTime)) / 60000;

            if (minsSinceApproval > 10) {
                // PENALTY: Award Violation Points for dropping late
                await awardViolationPoint(user_email, 2, `Dropped from event ${event_type}:${event_id} outside 10m grace period.`);
                console.log(`[Points] Participant ${user_email} dropped LATE. Penalty applied.`);
            } else {
                console.log(`[Points] Participant ${user_email} dropped within grace period. No penalty.`);
            }

            await sequelize.query(
                "UPDATE event_participants SET status = 'cancelled', version = version + 1, updated_at = NOW() WHERE id = ?",
                { replacements: [parts[0].id], transaction: t }
            );

            await sequelize.query(
                `INSERT INTO audit_logs (id, actor_id, event_id, action, previous_state, new_state, request_id, timestamp) 
                 VALUES (UUID(), ?, ?, 'JOIN_DROP', 'approved', 'cancelled', ?, NOW())`,
                { replacements: [user_id, event_id, req.requestId], transaction: t }
            );

            await t.commit();
            return res.status(200).json({ success: true, message: 'Dropped from event', data: { status: 'cancelled' } });
        }

        if (parts[0].status !== 'pending') throw { status: 400, message: 'Can only cancel pending or approved requests' };

        await sequelize.query(
            "UPDATE event_participants SET status = 'cancelled', version = version + 1, updated_at = NOW() WHERE id = ?",
            { replacements: [parts[0].id], transaction: t }
        );


        await sequelize.query(
            `INSERT INTO audit_logs (id, actor_id, event_id, action, previous_state, new_state, request_id, timestamp) 
             VALUES (UUID(), ?, ?, 'JOIN_CANCEL', 'pending', 'cancelled', ?, NOW())`,
            { replacements: [user_id, event_id, req.requestId], transaction: t }
        );

        await t.commit();
        res.status(200).json({ success: true, message: 'Cancelled', data: { status: 'cancelled' } });
    } catch (err) {
        if (t) await t.rollback();
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// 3. POST /api/v1/join/approve
router.post('/join/approve', async (req, res) => {
    const { event_type, event_id, participant_id, host_email } = req.body;
    if (!event_type || !event_id || !participant_id || !host_email) return res.status(400).json({ success: false, message: 'Missing fields' });

    let t;
    try {
        t = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });
        const tableName = getTableName(event_type);
        const capacityCol = getCapacityColumn(event_type);

        const [events] = await sequelize.query(`SELECT host_email, title, ${capacityCol} as capacity FROM ${tableName} WHERE id = ? FOR UPDATE`, { replacements: [event_id], transaction: t });
        if (events.length === 0) throw { status: 404, message: 'Event not found' };
        if (events[0].host_email !== host_email) throw { status: 403, message: 'Unauthorized' };

        const targetEmailVars = getEmailVariations(req.body.target_user_email);
        const [lookup] = await sequelize.query(
            "SELECT id FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id IN (SELECT id FROM users WHERE email IN (?)) FOR UPDATE",
            { replacements: [event_type, event_id, targetEmailVars], transaction: t }
        );
        if (lookup.length === 0) throw { status: 404, message: 'Participant not found' };

        let finalPartId = lookup[0].id;

        const [approved] = await sequelize.query(
            "SELECT COUNT(*) as count FROM event_participants WHERE event_type = ? AND event_id = ? AND status = 'approved' FOR UPDATE",
            { replacements: [event_type, event_id], transaction: t }
        );

        // --- CAPACITY CHECK ---
        const approvedCount = parseInt(approved[0].count, 10);
        // Host-Inclusive Rule: Host is already in event_participants, so approvedCount reflects (Host + Approved Participants).
        const currentCount = approvedCount;

        if (currentCount >= events[0].capacity) {
            throw { status: 409, message: 'Event full' };
        }

        const [parts] = await sequelize.query(
            "SELECT id, user_id, status FROM event_participants WHERE id = ? FOR UPDATE",
            { replacements: [finalPartId], transaction: t }
        );
        if (parts.length === 0) throw { status: 404, message: 'Participant not found' };
        if (parts[0].status !== 'pending') throw { status: 400, message: 'Not pending' };

        await sequelize.query("UPDATE event_participants SET status = 'approved', version = version + 1, updated_at = NOW() WHERE id = ?", { replacements: [finalPartId], transaction: t });

        // NEW: AUTO-CLOSE ON FULL CAPACITY
        const [updatedApproved] = await sequelize.query(
            "SELECT COUNT(*) as count FROM event_participants WHERE event_type = ? AND event_id = ? AND status = 'approved' FOR UPDATE",
            { replacements: [event_type, event_id], transaction: t }
        );

        const totalAfterApprove = parseInt(updatedApproved[0].count, 10);
        if (totalAfterApprove >= events[0].capacity) {
            await sequelize.query(`UPDATE ${tableName} SET status = 'full' WHERE id = ?`, { replacements: [event_id], transaction: t });
            logger.info(`Event ${event_type}:${event_id} marked as FULL. (Total: ${totalAfterApprove})`);
        }

        // Auto Chat Join
        const roomId = `${event_type}_${event_id}`;
        const [targetUser] = await sequelize.query("SELECT email, username FROM users WHERE id = ?", { replacements: [parts[0].user_id], transaction: t });
        if (targetUser.length > 0) {
            await sequelize.query(
                "INSERT INTO chat_participants (room_id, user_email, user_name, role) VALUES (?, ?, ?, 'member') ON DUPLICATE KEY UPDATE role = 'member'",
                { replacements: [roomId, targetUser[0].email, targetUser[0].username], transaction: t }
            );
        }

        const outboxPayload = JSON.stringify({
            recipient_email: targetUser[0]?.email,
            event_type, event_id, status: 'approved',
            event_title: events[0].title,
            actionType: 'NAVIGATE_TO_EVENT_DETAIL',
            targetId: event_id,
            version: '1'
        });
        await sequelize.query(
            `INSERT INTO outbox_events (id, idempotency_key, aggregate_type, aggregate_id, type, payload, created_at) 
             VALUES (UUID(), ?, 'participant', ?, 'join_approved', ?, NOW())`,
            { replacements: [req.idempotencyKey || req.requestId, `approve_${participant_id}`, outboxPayload], transaction: t }
        );

        await t.commit();

        // 🚀 Real-time Notification Shortcut (Shortcut to Activities)
        try {
            const io = req.app.get('io');
            if (io && targetUser.length > 0) {
                const targetEmail = targetUser[0].email;
                const normalizedTargetEmail = targetEmail.toLowerCase().trim();
                const participantRoom = `user_${normalizedTargetEmail}`;

                io.to(participantRoom).emit('join_accepted', {
                    eventName: events[0].title,
                    eventId: event_id,
                    eventType: event_type,
                    message: `🎉 You have been accepted to "${events[0].title}"! Click here to view your activity history.`
                });
                console.log(`[Socket] Targeted join_accepted emitted to: ${participantRoom}`);
            }
        } catch (socketErr) {
            console.error(`[Socket] Failed to emit join_accepted:`, socketErr.message);
        }

        res.status(200).json({ success: true, message: 'Approved' });
    } catch (err) {
        if (t) await t.rollback();
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// 4. POST /api/v1/join/reject
router.post('/join/reject', async (req, res) => {
    const { event_type, event_id, participant_id, host_email } = req.body;
    console.log(`[JoinService] Processing REJECT for ${event_type}:${event_id}`, { participant_id, host_email });
    let t;
    try {
        t = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });
        const tableName = getTableName(event_type);
        const [events] = await sequelize.query(`SELECT host_email, title FROM ${tableName} WHERE id = ? FOR UPDATE`, { replacements: [event_id], transaction: t });
        if (events.length === 0 || events[0].host_email !== host_email) throw { status: 403, message: 'Unauthorized' };

        const targetEmailVars = getEmailVariations(req.body.target_user_email);
        const [lookup] = await sequelize.query(
            "SELECT id FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id IN (SELECT id FROM users WHERE email IN (?)) FOR UPDATE",
            { replacements: [event_type, event_id, targetEmailVars], transaction: t }
        );
        if (lookup.length === 0) throw { status: 404, message: 'Not found' };

        let finalPartId = lookup[0].id;

        const [parts] = await sequelize.query("SELECT user_id FROM event_participants WHERE id = ? FOR UPDATE", { replacements: [finalPartId], transaction: t });
        if (parts.length === 0) throw { status: 404, message: 'Not found' };

        await sequelize.query("UPDATE event_participants SET status = 'rejected', version = version + 1, updated_at = NOW() WHERE id = ?", { replacements: [finalPartId], transaction: t });

        const [targetUser] = await sequelize.query("SELECT email FROM users WHERE id = ?", { replacements: [parts[0].user_id], transaction: t });
        const outboxPayload = JSON.stringify({
            recipient_email: targetUser[0]?.email,
            event_type, event_id, status: 'rejected',
            event_title: events[0].title,
            version: '1'
        });
        await sequelize.query(
            `INSERT INTO outbox_events (id, idempotency_key, aggregate_type, aggregate_id, type, payload, created_at) 
             VALUES (UUID(), ?, 'participant', ?, 'join_rejected', ?, NOW())`,
            { replacements: [req.idempotencyKey || req.requestId, `reject_${participant_id}`, outboxPayload], transaction: t }
        );

        await t.commit();
        res.status(200).json({ success: true, message: 'Rejected' });
    } catch (err) {
        if (t) await t.rollback();
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// 5. GET /api/v1/notifications
router.get('/notifications', async (req, res) => {
    const { user_email, limit = 20, cursor, unread_only } = req.query;

    if (!user_email) {
        return res.status(400).json({ success: false, message: 'Email kosong!' });
    }

    try {
        // KITA PAKAI JALAN PINTAS (JOIN) BIAR JAVASCRIPT NGGAK USAH PUSING BACA ID
        let queryStr = `
            SELECT n.id, n.type, n.metadata, n.is_read, n.created_at 
            FROM system_notifications n 
            JOIN users u ON n.recipient_id = u.id 
            WHERE LOWER(u.email) = LOWER(:email)
        `;
        let replacements = { email: user_email };

        if (unread_only === 'true') {
            queryStr += ` AND n.is_read = 0`;
        }

        if (cursor) {
            queryStr += ` AND n.created_at < :cursor`;
            replacements.cursor = new Date(cursor);
        }

        const safeLimit = parseInt(limit) + 1;
        queryStr += ` ORDER BY n.created_at DESC LIMIT ${safeLimit}`;

        // Tambahkan "type: SELECT" biar hasilnya otomatis bersih
        const results = await sequelize.query(queryStr, {
            replacements: replacements,
            type: sequelize.QueryTypes.SELECT
        });

        const hasMore = results.length > parseInt(limit);
        const list = hasMore ? results.slice(0, parseInt(limit)) : results;

        res.json({
            success: true,
            data: {
                list,
                paginationInfo: {
                    cursor: hasMore ? list[list.length - 1].created_at : null,
                    hasMore
                }
            }
        });
    } catch (err) {
        console.error("Error Terakhir di /notifications:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5.1 POST /api/v1/notifications/:id/mark-as-read
router.post('/notifications/:id/mark-as-read', async (req, res) => {
    const { id } = req.params;
    try {
        await sequelize.query(
            "DELETE FROM system_notifications WHERE id = ?",
            { replacements: [id] }
        );
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
        console.error("Error marking notification as read:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});


// 6. GET /api/v1/join/my-statuses
router.get('/join/my-statuses', async (req, res) => {
    const { user_email } = req.query;
    try {
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [user_email] });
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        const [parts] = await sequelize.query("SELECT event_type, event_id, status FROM event_participants WHERE user_id = ?", { replacements: [users[0].id] });
        const statusMap = {};
        parts.forEach(p => statusMap[`${p.event_type}_${p.event_id}`] = p.status);
        res.json({ success: true, data: statusMap });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6.1 GET /api/v1/notifications/unread-count
router.get('/notifications/unread-count', async (req, res) => {
    const { user_email } = req.query;
    if (!user_email) return res.status(400).json({ success: false, message: 'Email required' });
    try {
        const [results] = await sequelize.query(
            "SELECT COUNT(*) as count FROM system_notifications n JOIN users u ON n.recipient_id = u.id WHERE u.email = ?",
            { replacements: [user_email] }
        );
        res.json({ success: true, count: results[0].count });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6.2 POST /api/v1/notifications/mark-all-read
router.post('/notifications/mark-all-read', async (req, res) => {
    const { user_email } = req.body;
    if (!user_email) return res.status(400).json({ success: false, message: 'Email required' });
    try {
        await sequelize.query(
            "DELETE FROM system_notifications WHERE recipient_id IN (SELECT id FROM users WHERE email = ?)",
            { replacements: [user_email] }
        );
        res.json({ success: true, message: 'All notifications cleared' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 7. GET /api/v1/host/participants
router.get('/host/participants', async (req, res) => {
    const { event_type, event_id, host_email, status, limit = 20, cursor_at, cursor_id } = req.query;

    try {
        if (!event_type || !event_id || !host_email) {
            return res.status(400).json({ success: false, message: 'Missing required parameters (event_type, event_id, host_email)' });
        }

        const tableName = getTableName(event_type);
        const [events] = await sequelize.query(`SELECT host_email FROM ${tableName} WHERE id = ?`, { replacements: [event_id] });

        if (events.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // --- CASE-INSENSITIVE EMAIL CHECK (PROTOCOL ZERO 500 ERROR) ---
        const eventHostEmail = (events[0].host_email || '').toLowerCase().trim();
        const requestHostEmail = (host_email || '').toLowerCase().trim();

        if (eventHostEmail !== requestHostEmail) {
            console.warn(`[Auth] Unauthorized host access attempt. Event Host: ${eventHostEmail}, Request Host: ${requestHostEmail}`);
            return res.status(403).json({ success: false, message: 'Unauthorized. You are not the host of this event.' });
        }

        let queryStr = `
            SELECT ep.id, ep.user_id, u.email as user_email, ep.status, 
                   ep.snapshot_display_name, ep.snapshot_avatar_url, ep.snapshot_bio, 
                   ep.created_at, ep.updated_at 
            FROM event_participants ep
            JOIN users u ON ep.user_id = u.id
            WHERE ep.event_type = ? AND ep.event_id = ?`;
        const replacements = [event_type, event_id];

        if (status) {
            queryStr += ` AND status = ?`;
            replacements.push(status);
        }

        if (cursor_at && cursor_id) {
            queryStr += ` AND (created_at < ? OR (created_at = ? AND id < ?))`;
            replacements.push(new Date(cursor_at), new Date(cursor_at), cursor_id);
        }

        queryStr += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
        replacements.push(parseInt(limit));

        const results = await sequelize.query(queryStr, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: results });
    } catch (err) {
        console.error('[API] Error in /host/participants:', err);
        res.status(500).json({ success: false, message: 'Internal server error while fetching participants: ' + err.message });
    }
});


// Endpoint untuk mengambil profil user dari database MySQL
router.get('/profile-user', async (req, res) => {
    const { email } = req.query;
    try {
        const [users] = await sequelize.query(
            'SELECT username, email, major, study_year, bio, hobby, profile_pic FROM users WHERE email = ?',
            { replacements: [email] }
        );
        res.json(users); // Mengirim data user kembali ke frontend
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// NEW: Unified Activity Dashboard Feed
// Fetches all events where the user is either the HOST or an APPROVED participant.
// Uses SQL UNION ALL with standardized aliases for the frontend.
router.get('/my-activities', async (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) {
        return res.status(400).json({ success: false, message: 'User email is required' });
    }

    try {
        const query = `
            /* --- PART 1: HOSTED BY ME (ALL STATUSES) --- */
            SELECT 
                a.id, a.title, 'sports' as category, a.event_time as unified_event_time, a.location as unified_location, a.people_needed, a.host_email, a.status, a.created_at,
                u.username as host_name, u.major as host_dept, u.profile_pic,
                'host' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'sports' AND event_id = a.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM activities a
            LEFT JOIN users u ON LOWER(a.host_email) = LOWER(u.email)
            WHERE LOWER(a.host_email) = LOWER(:email)

            UNION ALL

            SELECT 
                c.id, c.title, 'carpool' as category, c.departure_time as unified_event_time, c.departure_loc as unified_location, c.available_seats as people_needed, c.host_email, c.status, c.created_at,
                c.host_name, c.host_dept, u.profile_pic,
                'host' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'carpool' AND event_id = c.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM carpools c
            LEFT JOIN users u ON LOWER(c.host_email) = LOWER(u.email)
            WHERE LOWER(c.host_email) = LOWER(:email)

            UNION ALL

            SELECT 
                s.id, s.title, 'study' as category, s.event_time as unified_event_time, s.location as unified_location, s.people_needed, s.host_email, s.status, s.created_at,
                s.host_name, s.host_dept, u.profile_pic,
                'host' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'study' AND event_id = s.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM studies s
            LEFT JOIN users u ON LOWER(s.host_email) = LOWER(u.email)
            WHERE LOWER(s.host_email) = LOWER(:email)

            UNION ALL

            SELECT 
                h.id, h.title, 'hangout' as category, h.event_time as unified_event_time, h.meeting_location as unified_location, h.people_needed, h.host_email, h.status, h.created_at,
                h.host_name, h.host_dept, u.profile_pic,
                'host' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'hangout' AND event_id = h.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM hangouts h
            LEFT JOIN users u ON LOWER(h.host_email) = LOWER(u.email)
            WHERE LOWER(h.host_email) = LOWER(:email)

            UNION ALL

            SELECT 
                ho.id, ho.title, 'housing' as category, ho.deadline as unified_event_time, ho.location as unified_location, ho.people_needed, ho.host_email, ho.status, ho.created_at,
                ho.host_name, ho.host_dept, u.profile_pic,
                'host' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'housing' AND event_id = ho.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM housing ho
            LEFT JOIN users u ON LOWER(ho.host_email) = LOWER(u.email)
            WHERE LOWER(ho.host_email) = LOWER(:email)

            UNION ALL

            /* --- PART 2: JOINED BY ME (ONLY APPROVED/ACCEPTED) --- */
            SELECT 
                a.id, a.title, 'sports' as category, a.event_time as unified_event_time, a.location as unified_location, a.people_needed, a.host_email, a.status, a.created_at,
                u_host.username as host_name, u_host.major as host_dept, u_host.profile_pic,
                'participant' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'sports' AND event_id = a.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM activities a
            JOIN event_participants ep ON (ep.event_type = 'sports' AND ep.event_id = a.id)
            JOIN users u_me ON ep.user_id = u_me.id
            LEFT JOIN users u_host ON LOWER(a.host_email) = LOWER(u_host.email)
            WHERE LOWER(u_me.email) = LOWER(:email) 
              AND ep.status IN ('approved', 'accepted')
              AND LOWER(a.host_email) != LOWER(:email)

            UNION ALL

            SELECT 
                c.id, c.title, 'carpool' as category, c.departure_time as unified_event_time, c.departure_loc as unified_location, c.available_seats as people_needed, c.host_email, c.status, c.created_at,
                u_host.username as host_name, u_host.major as host_dept, u_host.profile_pic,
                'participant' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'carpool' AND event_id = c.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM carpools c
            JOIN event_participants ep ON (ep.event_type = 'carpool' AND ep.event_id = c.id)
            JOIN users u_me ON ep.user_id = u_me.id
            LEFT JOIN users u_host ON LOWER(c.host_email) = LOWER(u_host.email)
            WHERE LOWER(u_me.email) = LOWER(:email) 
              AND ep.status IN ('approved', 'accepted')
              AND LOWER(c.host_email) != LOWER(:email)

            UNION ALL

            SELECT 
                s.id, s.title, 'study' as category, s.event_time as unified_event_time, s.location as unified_location, s.people_needed, s.host_email, s.status, s.created_at,
                u_host.username as host_name, u_host.major as host_dept, u_host.profile_pic,
                'participant' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'study' AND event_id = s.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM studies s
            JOIN event_participants ep ON (ep.event_type = 'study' AND ep.event_id = s.id)
            JOIN users u_me ON ep.user_id = u_me.id
            LEFT JOIN users u_host ON LOWER(s.host_email) = LOWER(u_host.email)
            WHERE LOWER(u_me.email) = LOWER(:email) 
              AND ep.status IN ('approved', 'accepted')
              AND LOWER(s.host_email) != LOWER(:email)

            UNION ALL

            SELECT 
                h.id, h.title, 'hangout' as category, h.event_time as unified_event_time, h.meeting_location as unified_location, h.people_needed, h.host_email, h.status, h.created_at,
                u_host.username as host_name, u_host.major as host_dept, u_host.profile_pic,
                'participant' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'hangout' AND event_id = h.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM hangouts h
            JOIN event_participants ep ON (ep.event_type = 'hangout' AND ep.event_id = h.id)
            JOIN users u_me ON ep.user_id = u_me.id
            LEFT JOIN users u_host ON LOWER(h.host_email) = LOWER(u_host.email)
            WHERE LOWER(u_me.email) = LOWER(:email) 
              AND ep.status IN ('approved', 'accepted')
              AND LOWER(h.host_email) != LOWER(:email)

            UNION ALL

            SELECT 
                ho.id, ho.title, 'housing' as category, ho.deadline as unified_event_time, ho.location as unified_location, ho.people_needed, ho.host_email, ho.status, ho.created_at,
                u_host.username as host_name, u_host.major as host_dept, u_host.profile_pic,
                'participant' as user_role,
                (SELECT COUNT(*) FROM event_participants WHERE event_type = 'housing' AND event_id = ho.id AND status IN ('approved', 'accepted')) as approvedCount
            FROM housing ho
            JOIN event_participants ep ON (ep.event_type = 'housing' AND ep.event_id = ho.id)
            JOIN users u_me ON ep.user_id = u_me.id
            LEFT JOIN users u_host ON LOWER(ho.host_email) = LOWER(u_host.email)
            WHERE LOWER(u_me.email) = LOWER(:email) 
              AND ep.status IN ('approved', 'accepted')
              AND LOWER(ho.host_email) != LOWER(:email)

            ORDER BY created_at DESC
        `;

        const results = await sequelize.query(query, {
            replacements: { email },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: results });
    } catch (err) {
        console.error('[API] Error in /api/v1/my-activities:', err);
        res.status(500).json({ success: false, message: 'Internal server error: ' + err.message });
    }
});

module.exports = router;

