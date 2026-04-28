const sequelize = require('./database');

async function setSingleAdmin() {
    try {
        // Reset everyone to non-admin
        await sequelize.query("UPDATE users SET is_admin = 0");
        
        // Insert or Update the admin account
        await sequelize.query(`
            INSERT INTO users (email, is_admin, username, password) 
            VALUES ('ncnujoinupadmin@gmail.com', 1, 'JoinUp Admin', 'placeholder')
            ON DUPLICATE KEY UPDATE is_admin = 1
        `);
        
        // Verify current admins
        const [admins] = await sequelize.query("SELECT email, is_admin FROM users WHERE is_admin = 1");
        console.log("Current Admins in Database:", admins);
        
        if (admins.length === 1 && admins[0].email === 'ncnujoinupadmin@gmail.com') {
             console.log("SUCCESS: 'ncnujoinupadmin@gmail.com' is now the ONLY admin.");
        } else {
             console.log("WARNING: Admin list doesn't match expectations.");
        }
    } catch (error) {
        console.error("Error updating admins:", error);
    } finally {
        process.exit();
    }
}

setSingleAdmin();
