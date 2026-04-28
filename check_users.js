const sequelize = require('./database');

async function checkUsers() {
    try {
        const [users] = await sequelize.query("SELECT email, is_admin FROM users LIMIT 10");
        console.log("Users:", users);
        
        const [allAdmins] = await sequelize.query("SELECT email, is_admin FROM users WHERE is_admin = 1");
        console.log("All Admins:", allAdmins);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

checkUsers();
