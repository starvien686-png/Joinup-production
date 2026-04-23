const sequelize = require('../database');

async function migrate() {
    try {
        console.log("Checking if is_admin column exists...");
        const [results] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'is_admin'");
        
        if (results.length === 0) {
            console.log("Column 'is_admin' not found. Adding it now...");
            await sequelize.query("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0 AFTER violation_points");
            console.log("Success: 'is_admin' column added successfully.");
        } else {
            console.log("Column 'is_admin' already exists.");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err.message);
        process.exit(1);
    }
}

migrate();
