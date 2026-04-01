const sequelize = require('../database');
const User = require('../User');

async function migrateRoles() {
    try {
        console.log('--- Starting Role Migration ---');
        
        // 1. Update 'student' to 'bachelor_student'
        const [results] = await sequelize.query(
            "UPDATE users SET role = 'bachelor_student' WHERE role = 'student'"
        );
        
        console.log(`Success! Updated ${results.affectedRows || 'X'} users from 'student' to 'bachelor_student'.`);
        
        // Verification
        const [check] = await sequelize.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
        if (check[0].count === 0) {
            console.log('Verification: No users with role "student" remaining.');
        } else {
            console.warn(`Warning: ${check[0].count} users still have role "student".`);
        }

        console.log('--- Migration Finished ---');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateRoles();
