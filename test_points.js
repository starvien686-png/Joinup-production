const { awardCreditPoint, awardViolationPoint } = require('./services/points_service');
const sequelize = require('./database');

async function test() {
    try {
        const testEmail = 'testuser@ncnu.edu.tw';
        console.log(`--- Testing Points System for ${testEmail} ---`);

        // Ensure test user exists
        await sequelize.query("INSERT IGNORE INTO users (id, email, username, password, role) VALUES (UUID(), ?, 'Test User', 'abc', 'user')", { replacements: [testEmail] });
        // Reset user for test
        await sequelize.query("UPDATE users SET credit_points = 0, violation_points = 0, status = 'active' WHERE email = ?", { replacements: [testEmail] });

        // 1. Test Credit Award
        console.log('1. Testing Credit Point Award...');
        await awardCreditPoint(testEmail, 1);
        const [u1] = await sequelize.query("SELECT credit_points FROM users WHERE email = ?", { replacements: [testEmail] });
        console.log(`   - Credit Points: ${u1[0].credit_points} (Expected: 1)`);

        // 2. Test Violation Point & Auto-Ban
        console.log('2. Testing Violation & Auto-Ban...');
        await awardViolationPoint(testEmail, 2, 'Minor violation');
        const [u2] = await sequelize.query("SELECT violation_points, status FROM users WHERE email = ?", { replacements: [testEmail] });
        console.log(`   - Violation Points: ${u2[0].violation_points} (Expected: 2)`);
        console.log(`   - Status: ${u2[0].status} (Expected: active)`);

        await awardViolationPoint(testEmail, 1, 'Third violation');
        const [u3] = await sequelize.query("SELECT violation_points, status FROM users WHERE email = ?", { replacements: [testEmail] });
        console.log(`   - Violation Points: ${u3[0].violation_points} (Expected: 3)`);
        console.log(`   - Status: ${u3[0].status} (Expected: suspended)`);

        // 3. Test Violation Logs
        console.log('3. Testing Violation Logs...');
        const [logs] = await sequelize.query("SELECT * FROM violation_logs");
        console.log(`   - Total Logs in violation_logs table: ${logs.length}`);
        if (logs.length > 0) {
            console.log(`   - First log email: ${logs[0].user_email}`);
        }
        
        const [myLogs] = await sequelize.query("SELECT * FROM violation_logs WHERE user_email = ?", { replacements: [testEmail] });
        console.log(`   - Logs found for ${testEmail}: ${myLogs.length} (Expected: 2)`);

        
        console.log('--- Test Completed ---');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

test();
