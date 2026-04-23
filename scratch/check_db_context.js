const sequelize = require('../database');

async function checkDb() {
    try {
        const [[{ db }]] = await sequelize.query("SELECT DATABASE() as db");
        console.log("Connected to database:", db);
        const [results] = await sequelize.query("SHOW TABLES");
        console.table(results);
        process.exit(0);
    } catch (err) {
        console.error("Failed to check DB:", err.message);
        process.exit(1);
    }
}

checkDb();
