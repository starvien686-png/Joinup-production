const { Sequelize } = require('sequelize');
require('dotenv').config();

async function forceFix() {
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
        console.log('--- STARTING FORCE DB FIX ---');

        const runSql = async (sql) => {
            try {
                await sequelize.query(sql);
                console.log(`SUCCESS: ${sql}`);
            } catch (e) {
                console.log(`NOTICE: Skipping "${sql}" - Reason: ${e.message}`);
            }
        };

        // Fix event_participants
        console.log('\nFixing event_participants...');
        await runSql("ALTER TABLE event_participants ADD COLUMN snapshot_display_name VARCHAR(255) AFTER status");
        await runSql("ALTER TABLE event_participants ADD COLUMN snapshot_avatar_url TEXT AFTER snapshot_display_name");
        await runSql("ALTER TABLE event_participants ADD COLUMN snapshot_bio TEXT AFTER snapshot_avatar_url");
        await runSql("ALTER TABLE event_participants ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");

        // Fix outbox_events (fixing the server.js crash)
        console.log('\nFixing outbox_events...');
        await runSql("ALTER TABLE outbox_events ADD COLUMN idempotency_key VARCHAR(100) AFTER id");
        await runSql("ALTER TABLE outbox_events ADD COLUMN retry_count INT DEFAULT 0 AFTER status");
        await runSql("ALTER TABLE outbox_events ADD COLUMN last_attempt_at TIMESTAMP NULL AFTER retry_count");
        await runSql("ALTER TABLE outbox_events ADD COLUMN error_message TEXT AFTER last_attempt_at");

        // Fix system_notifications
        console.log('\nFixing system_notifications...');
        await runSql("ALTER TABLE system_notifications ADD COLUMN aggregate_id VARCHAR(100) AFTER type");
        await runSql("ALTER TABLE system_notifications ADD COLUMN link TEXT AFTER aggregate_id");
        await runSql("ALTER TABLE system_notifications ADD COLUMN action_metadata TEXT AFTER metadata");
        await runSql("ALTER TABLE system_notifications ADD COLUMN delivery_state VARCHAR(50) DEFAULT 'delivered' AFTER is_read");

        console.log('\n--- FORCE DB FIX COMPLETED ---');
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

forceFix();
