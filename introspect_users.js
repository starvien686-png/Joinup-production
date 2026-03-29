const sequelize = require('./database');
const fs = require('fs');

async function run() {
    try {
        const [u] = await sequelize.query('DESCRIBE users');
        fs.writeFileSync('schema_users.json', JSON.stringify(u, null, 2));
    } catch(e) {} finally { process.exit(); }
}
run();
