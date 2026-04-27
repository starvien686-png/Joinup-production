
const sequelize = require('./database');

async function listAdmins() {
    try {
        const [users] = await sequelize.query("SELECT email, is_admin FROM users WHERE is_admin = 1");
        console.log("Admins in DB:", users);
        
        const [allUsers] = await sequelize.query("SELECT email FROM users LIMIT 10");
        console.log("Some users in DB:", allUsers);
    } catch (error) {
        console.error("Error listing admins:", error);
    } finally {
        process.exit();
    }
}

listAdmins();
