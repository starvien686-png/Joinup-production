const sequelize = require('./database');
const { QueryTypes } = require('sequelize');

async function check() {
    try {
        const [results] = await sequelize.query('DESCRIBE housing');
        console.log('--- HOUSING TABLE COLUMNS ---');
        results.forEach(r => console.log(`${r.Field}: ${r.Type}`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
