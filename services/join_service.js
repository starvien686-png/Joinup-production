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
    return category === 'carpool' ? 'available_seats' : 'people_needed';
}

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
        if (approved[0].count >= event.capacity) {
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
            await t.commit();
            return res.status(200).json({ success: true, message: 'Already approved', data: { status: 'approved' } });
        }
        if (parts[0].status !== 'pending') throw { status: 400, message: 'Can only cancel pending requests' };

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
        const [events] = await sequelize.query(`SELECT host_email, people_needed FROM ${tableName} WHERE id = ? FOR UPDATE`, { replacements: [event_id], transaction: t });
        if (events.length === 0) throw { status: 404, message: 'Event not found' };
        if (events[0].host_email !== host_email) throw { status: 403, message: 'Unauthorized' };

        let finalPartId = participant_id;
        if (!finalPartId && req.body.target_user_email) {
            const [lookup] = await sequelize.query(
                "SELECT id FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = (SELECT id FROM users WHERE email = ?) FOR UPDATE",
                { replacements: [event_type, event_id, req.body.target_user_email], transaction: t }
            );
            if (lookup.length > 0) finalPartId = lookup[0].id;
        }
        if (!finalPartId) throw { status: 404, message: 'Participant not found' };

        const [approved] = await sequelize.query(
            "SELECT COUNT(*) as count FROM event_participants WHERE event_type = ? AND event_id = ? AND status = 'approved' FOR UPDATE",
            { replacements: [event_type, event_id], transaction: t }
        );
        if (approved[0].count >= events[0].people_needed) throw { status: 409, message: 'Event full' };

        const [parts] = await sequelize.query(
            "SELECT id, user_id, status FROM event_participants WHERE id = ? FOR UPDATE",
            { replacements: [finalPartId], transaction: t }
        );
        if (parts.length === 0) throw { status: 404, message: 'Participant not found' };
        if (parts[0].status !== 'pending') throw { status: 400, message: 'Not pending' };

        await sequelize.query("UPDATE event_participants SET status = 'approved', version = version + 1, updated_at = NOW() WHERE id = ?", { replacements: [finalPartId], transaction: t });

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
        res.status(200).json({ success: true, message: 'Approved' });
    } catch (err) {
        if (t) await t.rollback();
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// 4. POST /api/v1/join/reject
router.post('/join/reject', async (req, res) => {
    const { event_type, event_id, participant_id, host_email } = req.body;
    let t;
    try {
        t = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });
        const tableName = getTableName(event_type);
        const [events] = await sequelize.query(`SELECT host_email FROM ${tableName} WHERE id = ? FOR UPDATE`, { replacements: [event_id], transaction: t });
        if (events.length === 0 || events[0].host_email !== host_email) throw { status: 403, message: 'Unauthorized' };

        let finalPartId = participant_id;
        if (!finalPartId && req.body.target_user_email) {
            const [lookup] = await sequelize.query(
                "SELECT id FROM event_participants WHERE event_type = ? AND event_id = ? AND user_id = (SELECT id FROM users WHERE email = ?) FOR UPDATE",
                { replacements: [event_type, event_id, req.body.target_user_email], transaction: t }
            );
            if (lookup.length > 0) finalPartId = lookup[0].id;
        }
        if (!finalPartId) throw { status: 404, message: 'Not found' };

        const [parts] = await sequelize.query("SELECT user_id FROM event_participants WHERE id = ? FOR UPDATE", { replacements: [finalPartId], transaction: t });
        if (parts.length === 0) throw { status: 404, message: 'Not found' };

        await sequelize.query("UPDATE event_participants SET status = 'rejected', version = version + 1, updated_at = NOW() WHERE id = ?", { replacements: [finalPartId], transaction: t });

        const [targetUser] = await sequelize.query("SELECT email FROM users WHERE id = ?", { replacements: [parts[0].user_id], transaction: t });
        const outboxPayload = JSON.stringify({
            recipient_email: targetUser[0]?.email,
            event_type, event_id, status: 'rejected',
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
    const { user_email, limit = 20, cursor } = req.query;

    if (!user_email) {
        return res.status(400).json({ success: false, message: 'Email kosong!' });
    }

    try {
        // KITA PAKAI JALAN PINTAS (JOIN) BIAR JAVASCRIPT NGGAK USAH PUSING BACA ID
        let queryStr = `
            SELECT n.id, n.type, n.metadata, n.is_read, n.created_at 
            FROM system_notifications n 
            JOIN users u ON n.recipient_id = u.id 
            WHERE u.email = :email
        `;
        let replacements = { email: user_email };

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

// 7. GET /api/v1/host/participants
router.get('/host/participants', async (req, res) => {
    const { event_type, event_id, host_email, status, limit = 20, cursor_at, cursor_id } = req.query;
    try {
        const tableName = getTableName(event_type);
        const [events] = await sequelize.query(`SELECT host_email FROM ${tableName} WHERE id = ?`, { replacements: [event_id] });
        if (events.length === 0 || events[0].host_email !== host_email) throw { status: 403, message: 'Unauthorized' };

        let queryStr = `SELECT id, user_id, status, snapshot_display_name, snapshot_avatar_url, snapshot_bio, created_at, updated_at FROM event_participants WHERE event_type = ? AND event_id = ?`;
        const replacements = [event_type, event_id];
        if (status) { queryStr += ` AND status = ?`; replacements.push(status); }
        if (cursor_at && cursor_id) { queryStr += ` AND (created_at < ? OR (created_at = ? AND id < ?))`; replacements.push(new Date(cursor_at), new Date(cursor_at), cursor_id); }
        queryStr += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
        replacements.push(parseInt(limit));

        const [results] = await sequelize.query(queryStr, { replacements });
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

module.exports = router;
