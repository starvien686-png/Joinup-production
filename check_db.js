const sequelize = require('./database');
const fs = require('fs');

async function check() {
    try {
        const [schema] = await sequelize.query("DESCRIBE chat_messages");
        const [msgs] = await sequelize.query("SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 5");
        
        fs.writeFileSync('db_result.json', JSON.stringify({ schema, msgs }, null, 2));
        console.log("Written to db_result.json");
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('db_result.json', JSON.stringify({ error: err.message }, null, 2));
        process.exit(1);
    }
}

check();
