const sequelize = require('./database');

async function checkAdminAccount() {
    try {
        const [users] = await sequelize.query("SELECT * FROM users WHERE email LIKE '%admin%'");
        console.log("Admin accounts found:", users);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

checkAdminAccount();
