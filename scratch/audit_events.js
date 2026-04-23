const sequelize = require('../database');

async function check() {
    try {
        const tables = ['activities', 'carpools', 'studies', 'hangouts', 'housing'];
        for (const table of tables) {
            const [res] = await sequelize.query(`SELECT id, title, status, deadline FROM ${table} WHERE status = 'expired'`);
            console.log(`--- ${table} ---`);
            console.log(JSON.stringify(res, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
