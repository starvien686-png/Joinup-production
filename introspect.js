const sequelize = require('./database');
const fs = require('fs');

async function run() {
    try {
        const [act] = await sequelize.query('DESCRIBE activities');
        const [cp] = await sequelize.query('DESCRIBE chat_participants');
        
        fs.writeFileSync('schema_out.json', JSON.stringify({
            activities: act,
            chat_participants: cp
        }, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
