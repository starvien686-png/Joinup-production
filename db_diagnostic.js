const sequelize = require('./database');

async function finalReport() {
    try {
        // 1. All users
        const [users] = await sequelize.query("SELECT id, username, email, role, major, study_year, is_admin, credit_points, violation_points, status FROM users ORDER BY id");
        console.log(`\n========================================`);
        console.log(`  JoinUp Database Report`);
        console.log(`  Total Users: ${users.length}`);
        console.log(`========================================\n`);
        
        users.forEach(u => {
            const adminTag = u.is_admin ? ' 🛡️ [ADMIN]' : '';
            console.log(`  ID: ${u.id} | ${u.username} | ${u.email} | Role: ${u.role} | Major: ${u.major || 'N/A'} | Year: ${u.study_year || 'N/A'} | Status: ${u.status || 'active'}${adminTag}`);
        });

        // 2. Check all tables
        const tableChecks = ['activities', 'carpools', 'studies', 'hangouts', 'housing', 'event_participants', 'chat_messages', 'chat_participants', 'system_notifications'];
        console.log(`\n========================================`);
        console.log(`  Table Row Counts`);
        console.log(`========================================\n`);
        
        for (const table of tableChecks) {
            try {
                const [count] = await sequelize.query(`SELECT COUNT(*) as total FROM ${table}`);
                console.log(`  ${table}: ${count[0].total} rows`);
            } catch(e) {
                console.log(`  ${table}: TABLE NOT FOUND`);
            }
        }

        // 3. Indexes check
        const [indexes] = await sequelize.query("SHOW INDEX FROM users");
        console.log(`\n========================================`);
        console.log(`  Users Table Indexes`);
        console.log(`========================================\n`);
        indexes.forEach(i => console.log(`  ${i.Key_name} | Column: ${i.Column_name} | Unique: ${!i.Non_unique}`));

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        process.exit();
    }
}

finalReport();
