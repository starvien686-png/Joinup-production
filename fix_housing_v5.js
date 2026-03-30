const sequelize = require('./database');

async function fixHousingSegments() {
    try {
        console.log('--- STARTING HOUSING DB SYNC ---');

        const runSql = async (sql) => {
            try {
                await sequelize.query(sql);
                console.log(`SUCCESS: ${sql}`);
            } catch (e) {
                if (e.message.includes('Duplicate column name')) {
                    console.log(`NOTICE: Column already exists, skipping: "${sql}"`);
                } else {
                    console.log(`ERROR: "${sql}" - Reason: ${e.message}`);
                }
            }
        };

        // Add missing columns to housing table
        console.log('\nChecking "housing" table columns...');
        await runSql("ALTER TABLE housing ADD COLUMN host_name VARCHAR(255) AFTER host_email");
        await runSql("ALTER TABLE housing ADD COLUMN host_dept VARCHAR(255) AFTER host_name");
        await runSql("ALTER TABLE housing ADD COLUMN schedule_tags TEXT AFTER gender_req");
        await runSql("ALTER TABLE housing ADD COLUMN deadline DATETIME AFTER schedule_tags");
        await runSql("ALTER TABLE housing ADD COLUMN rental_period VARCHAR(100) AFTER deadline");
        await runSql("ALTER TABLE housing ADD COLUMN facilities TEXT AFTER rental_period");
        await runSql("ALTER TABLE housing ADD COLUMN habits TEXT AFTER facilities");

        // Ensure rent_amount and deposit are VARCHAR for flexible input
        console.log('\nOptimizing flexible input for rent/deposit...');
        await runSql("ALTER TABLE housing MODIFY COLUMN rent_amount VARCHAR(100)");
        await runSql("ALTER TABLE housing MODIFY COLUMN deposit VARCHAR(100)");

        console.log('\n--- HOUSING DB SYNC COMPLETED ---');
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        if (sequelize) await sequelize.close();
    }
}

fixHousingSegments();
