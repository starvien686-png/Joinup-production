require('dotenv').config();
const sequelize = require('./database');

async function runCleanup() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB...');
        
        const q1 = "DELETE FROM system_notifications WHERE aggregate_id IS NULL OR aggregate_id = '' OR aggregate_id = 'undefined';";
        const [r1] = await sequelize.query(q1);
        console.log('Cleaned system_notifications:', r1);

        const q2 = "DELETE FROM event_participants WHERE event_id IS NULL OR event_id = 0;";
        const [r2] = await sequelize.query(q2);
        console.log('Cleaned event_participants:', r2);
        
        console.log('Cleanup complete!');
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        process.exit(0);
    }
}
runCleanup();
