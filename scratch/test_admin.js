const sequelize = require('../database');

async function testAdmin() {
    try {
        const [results] = await sequelize.query("SELECT id, email FROM users WHERE LOWER(email) = 'ncnujoinupadmin@gmail.com'");
        console.log("Admin User:", results);
        process.exit(0);
    } catch (err) {
        console.error("Query Error:", err);
        process.exit(1);
    }
}
testAdmin();
