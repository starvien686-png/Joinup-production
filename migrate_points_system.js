const sequelize = require('./database');

async function migrate() {
    try {
        console.log('--- Starting Robust Migration ---');

        // 1. Check users table
        const [usersCols] = await sequelize.query("SHOW COLUMNS FROM users");
        const userFields = usersCols.map(c => c.Field);
        
        if (!userFields.includes('violation_points')) {
            await sequelize.query("ALTER TABLE users ADD COLUMN violation_points INT DEFAULT 0");
            console.log('   - Added users.violation_points');
        }
        if (!userFields.includes('status')) {
            await sequelize.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
            console.log('   - Added users.status');
        }

        // 2. Check violation_logs table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS violation_logs (
                id CHAR(36) PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                points INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                reason TEXT,
                admin_email VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   - violation_logs table checked');

        const [logCols] = await sequelize.query("SHOW COLUMNS FROM violation_logs");
        const logFields = logCols.map(c => c.Field);
        
        if (!logFields.includes('type')) {
            await sequelize.query("ALTER TABLE violation_logs ADD COLUMN type VARCHAR(50) DEFAULT 'automated' AFTER points");
            console.log('   - Added violation_logs.type');
        }
        if (!logFields.includes('admin_email')) {
            await sequelize.query("ALTER TABLE violation_logs ADD COLUMN admin_email VARCHAR(255) AFTER reason");
            console.log('   - Added violation_logs.admin_email');
        }

        console.log('--- Migration Completed ---');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
migrate();

