const sequelize = require('../database');

async function seedTestData() {
    try {
        console.log('--- Seeding Test Data for Successful Activities ---');
        
        // 1. Ensure we have users
        const [users] = await sequelize.query("SELECT id, email, username FROM users LIMIT 3");
        if (users.length < 2) {
            console.error("Not enough users to create test data. Please register at least 2 users.");
            return;
        }

        const host = users[0];
        const participant = users[1];

        // 2. Create a successful activity (Sports)
        console.log('Creating test activity...');
        const [actResult] = await sequelize.query(`
            INSERT INTO activities (host_email, category, title, sport_type, people_needed, event_time, location, status)
            VALUES (?, 'sports', 'Test Success Match 🏀', 'Basketball', 5, '2026-05-01 10:00:00', 'Gym', 'success')
        `, { replacements: [host.email] });

        const actId = actResult.insertId || actResult;

        // 3. Add participant
        console.log('Adding participant...');
        await sequelize.query(`
            INSERT INTO event_participants (event_type, event_id, user_id, status)
            VALUES ('sports', ?, ?, 'approved')
        `, { replacements: [actId, participant.id] });

        // 4. Create a successful carpool
        console.log('Creating test carpool...');
        const [carResult] = await sequelize.query(`
            INSERT INTO carpools (host_email, title, departure_loc, destination_loc, departure_time, available_seats, price, vehicle_type, status)
            VALUES (?, 'Test Success Ride 🚗', 'Campus', 'Station', '2026-05-02 14:00:00', 4, 0, 'Car', 'success')
        `, { replacements: [host.email] });

        const carId = carResult.insertId || carResult;

        // 5. Add participant to carpool
        await sequelize.query(`
            INSERT INTO event_participants (event_type, event_id, user_id, status)
            VALUES ('carpool', ?, ?, 'approved')
        `, { replacements: [carId, participant.id] });

        console.log('Test data seeded successfully!');

    } catch (error) {
        console.error('Error seeding test data:', error);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

seedTestData();
