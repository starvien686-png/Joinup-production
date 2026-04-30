const sequelize = require('./database');

async function normalizeData() {
    console.log("Starting data normalization...");
    try {
        // Normalize event_participants
        console.log("Normalizing event_participants...");
        await sequelize.query("UPDATE event_participants SET event_type = LOWER(event_type)");

        // Normalize chat_rooms
        console.log("Normalizing chat_rooms...");
        await sequelize.query("UPDATE chat_rooms SET room_id = LOWER(room_id), room_type = LOWER(room_type)");

        // Normalize chat_participants
        console.log("Normalizing chat_participants...");
        await sequelize.query("UPDATE chat_participants SET room_id = LOWER(room_id)");

        // Normalize chat_messages
        console.log("Normalizing chat_messages...");
        await sequelize.query("UPDATE chat_messages SET room_id = LOWER(room_id)");

        // Normalize main event tables category
        console.log("Normalizing main tables...");
        await sequelize.query("UPDATE activities SET category = LOWER(category)");
        await sequelize.query("UPDATE hangouts SET category = LOWER(category)");
        await sequelize.query("UPDATE studies SET event_type = LOWER(event_type)");

        console.log("Normalization complete!");
        process.exit(0);
    } catch (error) {
        console.error("Normalization failed:", error);
        process.exit(1);
    }
}

normalizeData();
