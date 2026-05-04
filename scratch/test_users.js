const sequelize = require('../database');

async function testUsers() {
    try {
        const [columns] = await sequelize.query("DESCRIBE users");
        console.log("users columns:", columns);
        process.exit(0);
    } catch (err) {
        console.error("Schema query Error:", err);
        process.exit(1);
    }
}
testUsers();
