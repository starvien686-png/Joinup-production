const { Sequelize } = require('sequelize');
require('dotenv').config();

async function verify() {
    const sequelize = new Sequelize(
        process.env.DB_NAME || 'joinup',
        process.env.DB_USER || 'root',
        process.env.DB_PASS || 'Vicdata.base8',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            dialect: 'mysql',
            logging: false,
            dialectOptions: { ssl: { rejectUnauthorized: false } }
        }
    );

    try {
        const tables = ['event_participants', 'system_notifications', 'outbox_events', 'audit_logs', 'dead_letter_queue'];
        for (const table of tables) {
            const [results] = await sequelize.query(`DESCRIBE ${table}`);
            console.log(`\nTable: ${table}`);
            console.table(results.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Key: r.Key, Default: r.Default })));
        }
    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await sequelize.close();
    }
}

verify();
