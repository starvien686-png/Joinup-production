const sequelize = require('../database');

async function purgeAllEvents() {
    console.log('--- PERMANENT DATA PURGE STARTED ---');
    console.log('Target: All event-related tables across all categories.');

    const tables = [
        'activities',
        'carpools',
        'studies',
        'hangouts',
        'housing',
        'event_participants',
        'chat_messages',
        'chat_participants',
        'activity_feedback',
        'outbox_events',
        'dead_letter_queue',
        'audit_logs',
        'system_notifications'
    ];

    try {
        // Disable FK checks to allow truncation of tables with dependencies
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('[1/3] Foreign key checks disabled.');

        for (const table of tables) {
            try {
                // Check if table exists before truncating to avoid errors in different environments
                const [results] = await sequelize.query(`SHOW TABLES LIKE '${table}'`);
                if (results.length > 0) {
                    await sequelize.query(`TRUNCATE TABLE ${table}`);
                    console.log(`[2/3] Purged: ${table}`);
                } else {
                    console.log(`[2/3] Skipped: ${table} (Does not exist)`);
                }
            } catch (err) {
                console.error(`[2/3] Failed to purge ${table}:`, err.message);
            }
        }

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('[3/3] Foreign key checks re-enabled.');
        
        console.log('--- PURGE COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR during purge:', error.message);
        try {
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (e) {}
        process.exit(1);
    }
}

purgeAllEvents();
