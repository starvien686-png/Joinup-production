
const sequelize = require('./database');

async function checkAdmin() {
    try {
        const [users] = await sequelize.query("SELECT email, is_admin FROM users WHERE email = 'ncnujoinupadmin@gmail.com'");
        console.log("Admin Check Result:", users);
    } catch (error) {
        console.error("Error checking admin:", error);
    } finally {
        process.exit();
    }
}

checkAdmin();
