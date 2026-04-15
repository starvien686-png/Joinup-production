const sequelize = require('./database');

async function check() {
    try {
        console.log('--- Checking Database Tables ---');
        
        const [usersCols] = await sequelize.query("SHOW COLUMNS FROM users");
        console.log('Users table columns:', usersCols.map(c => c.Field).join(', '));

        const [logCols] = await sequelize.query("SHOW COLUMNS FROM violation_logs");
        console.log('Violation_logs table columns:', logCols.map(c => c.Field).join(', '));

        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

check();
