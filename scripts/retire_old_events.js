require('dotenv').config();
const sequelize = require('../database');

async function retireOldEvents() {
    console.log('--- Starting Real-time Event Retirement ---');
    console.log('Time:', new Date().toISOString());

    const tables = ['activities', 'carpools', 'studies', 'hangouts', 'housing'];
    
    try {
        for (const table of tables) {
            console.log(`Processing table: ${table}...`);
            
            let timeCondition = '';
            if (table === 'carpools') {
                timeCondition = `AND (deadline < NOW() OR (deadline IS NULL AND departure_time < NOW()))`;
            } else if (table === 'housing') {
                timeCondition = `AND (deadline < NOW())`; // Housing only uses deadline
            } else {
                timeCondition = `AND (deadline < NOW() OR (deadline IS NULL AND event_time < NOW()))`;
            }

            // Log counts before
            const [beforeCount] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table} WHERE status = 'open' ${timeCondition}`);
            const countToUpdate = beforeCount[0].count;
            
            if (countToUpdate > 0) {
                await sequelize.query(`
                    UPDATE ${table} 
                    SET status = 'expired' 
                    WHERE status = 'open' 
                    ${timeCondition}
                `);
                console.log(`Successfully retired ${countToUpdate} events in ${table}.`);
            } else {
                console.log(`No expired 'open' events found in ${table}.`);
            }
        }
        
        console.log('--- Retirement Completed Successfully ---');
    } catch (error) {
        console.error('Error during retirement:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

retireOldEvents();
