const express = require('express');
const router = express.Router();
const sequelize = require('../database');
const crypto = require('crypto');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/join_service.log' }),
        new winston.transports.Console()
    ]
});

// Idempotency storage (In-memory for now, could be Redis in true prod)
const idempotencyStore = new Map();

function getTableName(eventType) {
    const map = {
        'activity': 'activities',
        'carpool': 'carpools',
        'study': 'studies',
        'hangout': 'hangouts',
        'housing': 'housing'
    };
    return map[eventType] || 'activities';
}

// Middleware: Idempotency & Correlation
function withIdempotency(req, res, next) {
    req.requestId = crypto.randomUUID();
    req.correlationId = req.headers['x-correlation-id'] || req.requestId;
    
    const idempotencyKey = req.headers['x-idempotency-key'];
    if (!idempotencyKey) return next();

    const stored = idempotencyStore.get(idempotencyKey);
    if (stored) {
        // Idempotency Conflict Handling
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
        if (stored.payloadHash !== payloadHash) {
            logger.warn(`Idempotency Conflict (409) for key ${idempotencyKey}`, { requestId: req.requestId });
            return res.status(409).json({ success: false, message: 'Idempotency key reused with different payload' });
        }
        logger.info(`Idempotent hit for key ${idempotencyKey}`, { requestId: req.requestId });
        return res.status(200).json(stored.response);
    }
    
    req.idempotencyKey = idempotencyKey;
    req.payloadHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
    
    // Hook into response to save memory
    const originalJson = res.json;
    res.json = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300 && req.idempotencyKey) {
            idempotencyStore.set(req.idempotencyKey, {
                payloadHash: req.payloadHash,
                response: body,
                expires: Date.now() + 5 * 60000 // 5 mins TTL
            });
        }
        return originalJson.call(this, body);
    };
    
    next();
}

// Cleanup idempotency keys periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of idempotencyStore.entries()) {
        if (now > value.expires) idempotencyStore.delete(key);
    }
}, 60000);

router.use(withIdempotency);

// 1. POST /api/v1/join
router.post('/join', async (req, res) => {
    const { event_type, event_id, user_email } = req.body;
    if (!event_type || !event_id || !user_email) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    let t;
    try {
        t = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });
        
        // 1. Get User ID
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [user_email], transaction: t });
        if (users.length === 0) throw new Error('User not found');
        const user_id = users[0].id;

        // 2. Lock Event (Primary Lock)
        const tableName = getTableName(event_type);
        const [events] = await sequelize.query(`SELECT status, host_email, people_needed FROM ${tableName} WHERE id = ? FOR UPDATE`, { replacements: [event_id], transaction: t });
        if (events.length === 0) throw new Error('Event not found');
        const event = events[0];

        if (event.status !== 'open') throw new Error('Event is locked or no longer open');
        if (event.host_email === user_email) throw new Error('Host cannot join their own event');
        
        // Count approved participants
        const [approved] = await sequelize.query(
            "SELECT COUNT(*) as count FROM event_participants WHERE event_type = ? AND event_id = ? AND status = 'approved' FOR UPDATE",
            { replacements: [event_type, event_id], transaction: t }
        );
        if (approved[0].count >= event.people_needed) {
            throw new Error('Event is full');
        }

        // 3. Lock Participant (Secondary Lock)
        const [parts] = await sequelize.query(
            "SELECT id, status, version FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = ? FOR UPDATE",
            { replacements: [event_type, event_id, user_id], transaction: t }
        );

        let finalParticipantState = 'pending';
        if (parts.length > 0) {
            const current = parts[0];
            if (['pending', 'approved'].includes(current.status)) {
                throw new Error(`Already applied. Status: ${current.status}`);
            }
            // Allow re-apply if rejected or cancelled
            await sequelize.query(
                "UPDATE event_participants SET status = 'pending', version = version + 1 WHERE id = ?",
                { replacements: [current.id], transaction: t }
            );
        } else {
            await sequelize.query(
                "INSERT INTO event_participants (event_type, event_id, user_id, status) VALUES (?, ?, ?, 'pending')",
                { replacements: [event_type, event_id, user_id], transaction: t }
            );
        }

        // 4. Outbox Side Effect
        const outboxPayload = JSON.stringify({
            recipient_email: event.host_email,
            event_type, event_id, user_email,
            requestId: req.requestId, correlationId: req.correlationId
        });
        await sequelize.query(
            "INSERT INTO outbox_events (id, aggregate_type, aggregate_id, type, payload) VALUES (UUID(), 'participant', ?, 'join_request', ?)",
            { replacements: [`${event_type}_${event_id}_${user_id}`, outboxPayload], transaction: t }
        );

        await t.commit();
        logger.info(`Join request submitted by ${user_email} for ${event_type} ${event_id}`, { requestId: req.requestId });
        res.status(202).json({ success: true, message: 'Join request pending approval', data: { status: 'pending' } });
    } catch (err) {
        if (t) await t.rollback();
        const msg = err.message;
        const status = msg.includes('found') ? 404 : (msg.includes('Already') || msg.includes('full') || msg.includes('locked') ? 400 : 500);
        logger.error(`Join error: ${msg}`, { requestId: req.requestId, correlationId: req.correlationId });
        res.status(status).json({ success: false, message: msg });
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
        if (users.length === 0) throw new Error('User not found');
        const user_id = users[0].id;

        const tableName = getTableName(event_type);
        await sequelize.query(`SELECT id FROM ${tableName} WHERE id = ? FOR UPDATE`, { replacements: [event_id], transaction: t });

        const [parts] = await sequelize.query(
            "SELECT id, status FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = ? FOR UPDATE",
            { replacements: [event_type, event_id, user_id], transaction: t }
        );
        if (parts.length === 0) throw new Error('No join request exists');
        if (parts[0].status === 'cancelled') throw new Error('Already cancelled');

        await sequelize.query(
            "UPDATE event_participants SET status = 'cancelled', version = version + 1 WHERE id = ?",
            { replacements: [parts[0].id], transaction: t }
        );

        // Optional outbox notification here
        await t.commit();
        res.status(200).json({ success: true, message: 'Join request cancelled', data: { status: 'cancelled' } });
    } catch (err) {
        if (t) await t.rollback();
        res.status(400).json({ success: false, message: err.message });
    }
});

// 3. POST /api/v1/join/approve
router.post('/join/approve', async (req, res) => {
    const { event_type, event_id, target_user_email, host_email } = req.body;
    if (!event_type || !event_id || !target_user_email || !host_email) return res.status(400).json({ success: false, message: 'Missing fields' });

    let t;
    try {
        t = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [target_user_email], transaction: t });
        if (users.length === 0) throw new Error('Target user not found');
        const target_user_id = users[0].id;

        const tableName = getTableName(event_type);
        const [events] = await sequelize.query(`SELECT host_email, people_needed FROM ${tableName} WHERE id = ? FOR UPDATE`, { replacements: [event_id], transaction: t });
        if (events.length === 0) throw new Error('Event not found');
        
        // Authorization
        if (events[0].host_email !== host_email) throw new Error('Only the host can approve');

        // Capacity re-check
        const [approved] = await sequelize.query(
            "SELECT COUNT(*) as count FROM event_participants WHERE event_type = ? AND event_id = ? AND status = 'approved' FOR UPDATE",
            { replacements: [event_type, event_id], transaction: t }
        );
        if (approved[0].count >= events[0].people_needed) {
            throw new Error('Event has reached maximum capacity');
        }

        const [parts] = await sequelize.query(
            "SELECT id, status FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = ? FOR UPDATE",
            { replacements: [event_type, event_id, target_user_id], transaction: t }
        );
        if (parts.length === 0) throw new Error('No pending request found');
        if (parts[0].status !== 'pending') throw new Error(`Cannot approve a ${parts[0].status} request`);

        await sequelize.query(
            "UPDATE event_participants SET status = 'approved', version = version + 1 WHERE id = ?",
            { replacements: [parts[0].id], transaction: t }
        );

        // Add user to chat room automatically
        let roomIdPrefix = '';
        if (event_type === 'carpool') roomIdPrefix = 'carpool_';
        else if (event_type === 'study') roomIdPrefix = 'study_';
        else if (event_type === 'hangout') roomIdPrefix = 'hangout_';
        else if (event_type === 'housing') roomIdPrefix = 'housing_';
        else roomIdPrefix = 'sports_'; 
        
        const room_id = roomIdPrefix + event_id;

        // Retrieve target user profile details to insert naturally into chat_participants
        const [tUserDetails] = await sequelize.query("SELECT username FROM users WHERE email = ?", { replacements: [target_user_email], transaction: t });
        const targetUserName = tUserDetails[0].username;

        // Ensure not already in chat
        const [existingChat] = await sequelize.query("SELECT id FROM chat_participants WHERE room_id = ? AND user_email = ? FOR UPDATE", { replacements: [room_id, target_user_email], transaction: t});
        if (existingChat.length === 0) {
            await sequelize.query(
                "INSERT INTO chat_participants (room_id, user_email, user_name, role) VALUES (?, ?, ?, 'member')",
                { replacements: [room_id, target_user_email, targetUserName], transaction: t }
            );
        }

        // Outbox side effect (Notify participant)
        const outboxPayload = JSON.stringify({
            recipient_email: target_user_email,
            event_type, event_id,
            requestId: req.requestId, correlationId: req.correlationId
        });
        await sequelize.query(
            "INSERT INTO outbox_events (id, aggregate_type, aggregate_id, type, payload) VALUES (UUID(), 'participant', ?, 'join_approved', ?)",
            { replacements: [`${event_type}_${event_id}_${target_user_id}`, outboxPayload], transaction: t }
        );

        await t.commit();
        res.status(200).json({ success: true, message: 'Approved successfully', data: { status: 'approved' } });
    } catch (err) {
        if (t) await t.rollback();
        const msg = err.message;
        const status = msg.includes('found') ? 404 : (msg.includes('capacity') || msg.includes('Cannot') || msg.includes('Only') ? 400 : 500);
        res.status(status).json({ success: false, message: msg });
    }
});

// 4. POST /api/v1/join/reject
router.post('/join/reject', async (req, res) => {
    const { event_type, event_id, target_user_email, host_email } = req.body;
    if (!event_type || !event_id || !target_user_email || !host_email) return res.status(400).json({ success: false, message: 'Missing fields' });

    let t;
    try {
        t = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [target_user_email], transaction: t });
        if (users.length === 0) throw new Error('Target user not found');
        const target_user_id = users[0].id;

        const tableName = getTableName(event_type);
        const [events] = await sequelize.query(`SELECT host_email FROM ${tableName} WHERE id = ? FOR UPDATE`, { replacements: [event_id], transaction: t });
        if (events.length === 0) throw new Error('Event not found');
        
        if (events[0].host_email !== host_email) throw new Error('Only the host can reject');

        const [parts] = await sequelize.query(
            "SELECT id, status FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = ? FOR UPDATE",
            { replacements: [event_type, event_id, target_user_id], transaction: t }
        );
        if (parts.length === 0) throw new Error('No pending request found');
        if (parts[0].status !== 'pending') throw new Error(`Cannot reject a ${parts[0].status} request`);

        await sequelize.query(
            "UPDATE event_participants SET status = 'rejected', version = version + 1 WHERE id = ?",
            { replacements: [parts[0].id], transaction: t }
        );

        // Outbox side effect (Notify participant)
        const outboxPayload = JSON.stringify({
            recipient_email: target_user_email,
            event_type, event_id,
            requestId: req.requestId, correlationId: req.correlationId
        });
        await sequelize.query(
            "INSERT INTO outbox_events (id, aggregate_type, aggregate_id, type, payload) VALUES (UUID(), 'participant', ?, 'join_rejected', ?)",
            { replacements: [`${event_type}_${event_id}_${target_user_id}`, outboxPayload], transaction: t }
        );

        await t.commit();
        res.status(200).json({ success: true, message: 'Rejected successfully', data: { status: 'rejected' } });
    } catch (err) {
        if (t) await t.rollback();
        const msg = err.message;
        const status = msg.includes('found') ? 404 : (msg.includes('Cannot') || msg.includes('Only') ? 400 : 500);
        res.status(status).json({ success: false, message: msg });
    }
});

// GET /api/v1/notifications
router.get('/notifications', async (req, res) => {
    const { user_email, limit = 20, cursor } = req.query;
    if (!user_email) return res.status(400).json({ success: false, message: 'Missing user_email' });

    try {
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [user_email] });
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        const user_id = users[0].id;

        // CQRS-lite Read Model using Direct DB read for queries, pagination explicitly managed
        let queryStr = `SELECT id, type, metadata, is_read, created_at FROM system_notifications WHERE recipient_id = ?`;
        const replacements = [user_id];

        if (cursor) {
            queryStr += ` AND created_at < ?`;
            replacements.push(new Date(cursor));
        }
        
        queryStr += ` ORDER BY created_at DESC LIMIT ?`;
        replacements.push(parseInt(limit) + 1); // +1 to check if hasMore

        const [results] = await sequelize.query(queryStr, { replacements });

        const hasMore = results.length > limit;
        const list = hasMore ? results.slice(0, limit) : results;
        const nextCursor = hasMore ? list[list.length - 1].created_at : null;

        res.json({
            success: true,
            data: {
                list,
                paginationInfo: {
                    total: list.length, // approximation
                    limit: parseInt(limit),
                    cursor: nextCursor,
                    hasMore
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/v1/join/status
// Strongly Consistent read 
router.get('/join/status', async (req, res) => {
    const { event_type, event_id, user_email } = req.query;
    if (!event_type || !event_id || !user_email) return res.status(400).json({ success: false, message: 'Missing fields' });

    try {
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [user_email] });
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        const user_id = users[0].id;
        
        const [parts] = await sequelize.query(
            "SELECT status, version FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = ?",
            { replacements: [event_type, event_id, user_id] }
        );
        
        if (parts.length > 0) {
            res.json({ success: true, data: { status: parts[0].status, version: parts[0].version } });
        } else {
            res.json({ success: true, data: { status: 'none' } });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/v1/join/my-statuses
// Bulk read to prevent N+1 queries on the frontend
router.get('/join/my-statuses', async (req, res) => {
    const { user_email } = req.query;
    if (!user_email) return res.status(400).json({ success: false, message: 'Missing user_email' });

    try {
        const [users] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [user_email] });
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        const user_id = users[0].id;
        
        const [parts] = await sequelize.query(
            "SELECT event_type, event_id, status FROM event_participants WHERE user_id = ?",
            { replacements: [user_id] }
        );
        
        // Return a hashmap: "type_id": "status"
        const statusMap = {};
        parts.forEach(p => {
            statusMap[`${p.event_type}_${p.event_id}`] = p.status;
        });

        res.json({ success: true, data: statusMap });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
