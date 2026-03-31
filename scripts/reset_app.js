require('dotenv').config();
const sequelize = require('../database');

async function resetApp() {
    console.log('--- RESETTING APPLICATION EVENTS ---');
    const tables = ['activities', 'carpools', 'studies', 'hangouts', 'housing'];
    
    try {
        for (const table of tables) {
            console.log(`Resetting status for table: ${table}...`);
            const [result] = await sequelize.query(`UPDATE ${table} SET status = 'expired' WHERE status = 'open'`);
            console.log(`Updated ${result.affectedRows || result[1] || 'all'} rows to 'expired'.`);
        }
        console.log('--- RESET COMPLETED ---');
    } catch (error) {
        console.error('Reset failed:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

resetApp();
