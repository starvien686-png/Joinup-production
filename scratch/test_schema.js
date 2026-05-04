const sequelize = require('../database');

async function testSchema() {
    try {
        const [columns] = await sequelize.query("DESCRIBE event_participants");
        console.log("event_participants columns:", columns);
        process.exit(0);
    } catch (err) {
        console.error("Schema query Error:", err);
        process.exit(1);
    }
}
testSchema();
