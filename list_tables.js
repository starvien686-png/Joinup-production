const sequelize = require('./database');
const fs = require('fs');

async function listTables() {
    try {
        const [tables] = await sequelize.query('SHOW TABLES');
        fs.writeFileSync('tables.json', JSON.stringify(tables, null, 2));
        console.log("Tables extracted.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
listTables();
