const sequelize = require('../database');

async function testEventTypes() {
    try {
        const [results] = await sequelize.query("SELECT DISTINCT event_type FROM event_participants");
        console.log("Distinct event types in event_participants:", results);
        process.exit(0);
    } catch (err) {
        console.error("Query Error:", err);
        process.exit(1);
    }
}
testEventTypes();
