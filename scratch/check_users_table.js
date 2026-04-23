const sequelize = require('../database');

async function checkTable() {
    try {
        const [results] = await sequelize.query("DESCRIBE users");
        console.table(results);
        process.exit(0);
    } catch (err) {
        console.error("Failed to describe table:", err.message);
        process.exit(1);
    }
}

checkTable();
