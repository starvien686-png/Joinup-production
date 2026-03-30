const { Sequelize } = require('sequelize');
require('dotenv').config();

async function migrate() {
    const sequelize = new Sequelize(
        process.env.DB_NAME || 'joinup',
        process.env.DB_USER || 'root',
        process.env.DB_PASS || 'Vicdata.base8',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            dialect: 'mysql',
            logging: console.log,
            dialectOptions: {
                ssl: {
                    rejectUnauthorized: false
                }
            }
        }
    );

    try {
        console.log('Starting migration V2...');

        const addColumnSafely = async (table, column, definition) => {
            try {
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`Added column ${column} to ${table}`);
            } catch (e) {
                if (e.message.includes('Duplicate column name') || e.original?.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column ${column} already exists in ${table}`);
                } else {
                    throw e;
                }
            }
        };

        const createIndexSafely = async (indexName, table, columns) => {
            try {
                await sequelize.query(`CREATE INDEX ${indexName} ON ${table}(${columns})`);
                console.log(`Created index ${indexName} on ${table}`);
            } catch (e) {
                if (e.message.includes('Duplicate key name') || e.original?.code === 'ER_DUP_KEYNAME') {
                    console.log(`Index ${indexName} already exists on ${table}`);
                } else {
                    throw e;
                }
            }
        };

        // 1. event_participants
        await addColumnSafely('event_participants', 'snapshot_display_name', 'VARCHAR(255) AFTER status');
        await addColumnSafely('event_participants', 'snapshot_avatar_url', 'TEXT AFTER snapshot_display_name');
        await addColumnSafely('event_participants', 'snapshot_bio', 'TEXT AFTER snapshot_avatar_url');
        await addColumnSafely('event_participants', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
        
        await createIndexSafely('idx_event_status_created', 'event_participants', 'event_id, status, created_at');
        await createIndexSafely('idx_event_status_updated', 'event_participants', 'event_id, status, updated_at');

        // 2. system_notifications
        await addColumnSafely('system_notifications', 'aggregate_id', 'VARCHAR(100) AFTER type');
        await addColumnSafely('system_notifications', 'link', 'TEXT AFTER aggregate_id');
        await addColumnSafely('system_notifications', 'action_metadata', 'TEXT AFTER metadata');
        await addColumnSafely('system_notifications', 'delivery_state', "VARCHAR(50) DEFAULT 'delivered' AFTER is_read");
        
        try {
            await sequelize.query(`ALTER TABLE system_notifications ADD UNIQUE INDEX unique_notif (recipient_id, type, aggregate_id)`);
        } catch (e) { console.log('Unique index unique_notif might already exist.'); }

        // 3. outbox_events
        await addColumnSafely('outbox_events', 'idempotency_key', 'VARCHAR(100) AFTER id');
        await addColumnSafely('outbox_events', 'retry_count', 'INT DEFAULT 0 AFTER status');
        await addColumnSafely('outbox_events', 'last_attempt_at', 'TIMESTAMP NULL AFTER retry_count');
        await addColumnSafely('outbox_events', 'error_message', 'TEXT AFTER last_attempt_at');
        
        try {
            await sequelize.query(`ALTER TABLE outbox_events ADD UNIQUE INDEX unique_idempotency_key (idempotency_key)`);
        } catch (e) { console.log('Unique index unique_idempotency_key might already exist.'); }

        // 4. audit_logs (re-create or alter)
        await sequelize.query(`DROP TABLE IF EXISTS audit_logs`);
        await sequelize.query(`
            CREATE TABLE audit_logs (
                id VARCHAR(36) PRIMARY KEY,
                actor_id INT,
                event_id INT,
                participant_id INT,
                action VARCHAR(100),
                previous_state TEXT,
                new_state TEXT,
                request_id VARCHAR(100),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. dead_letter_queue
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS dead_letter_queue (
                id VARCHAR(36) PRIMARY KEY,
                original_event_id VARCHAR(36),
                idempotency_key VARCHAR(100),
                aggregate_type VARCHAR(50),
                aggregate_id VARCHAR(100),
                type VARCHAR(100),
                payload TEXT,
                error_message TEXT,
                failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 6. request_idempotency
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS request_idempotency (
                idempotency_key VARCHAR(100) PRIMARY KEY,
                request_hash VARCHAR(100),
                response_snapshot TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Migration V2 completed successfully.');
    } catch (error) {
        console.error('Migration V2 failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
