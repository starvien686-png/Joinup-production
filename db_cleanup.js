const sequelize = require('./database');

async function cleanupDuplicateIndexes() {
    try {
        console.log("=== Cleaning up duplicate UNIQUE indexes on users.email ===\n");

        // Get all indexes on users table
        const [indexes] = await sequelize.query("SHOW INDEX FROM users WHERE Column_name = 'email'");
        console.log("Current email indexes:");
        indexes.forEach(i => console.log(`  Key: ${i.Key_name} | Unique: ${!i.Non_unique}`));

        // Drop duplicate indexes (keep only 'email', remove email_2 through email_5)
        const duplicates = indexes.filter(i => i.Key_name !== 'email' && i.Key_name.startsWith('email_'));
        
        for (const dup of duplicates) {
            console.log(`\n  Dropping duplicate index: ${dup.Key_name}...`);
            await sequelize.query(`ALTER TABLE users DROP INDEX \`${dup.Key_name}\``);
            console.log(`  ✅ Dropped: ${dup.Key_name}`);
        }

        // Verify
        const [afterIndexes] = await sequelize.query("SHOW INDEX FROM users WHERE Column_name = 'email'");
        console.log("\n=== After Cleanup ===");
        afterIndexes.forEach(i => console.log(`  Key: ${i.Key_name} | Unique: ${!i.Non_unique}`));

        // Also show current users
        const [users] = await sequelize.query("SELECT id, username, email, is_admin FROM users ORDER BY id");
        console.log("\n=== All Users ===");
        users.forEach(u => console.log(`  ID: ${u.id} | ${u.username} | ${u.email} | Admin: ${u.is_admin}`));

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        process.exit();
    }
}

cleanupDuplicateIndexes();
