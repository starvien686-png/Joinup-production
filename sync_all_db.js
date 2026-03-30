const sequelize = require('./database');
const User = require('./User');
require('dotenv').config();

async function syncAll() {
    try {
        console.log('--- STARTING DEEP DATABASE SYNC ---');
        await sequelize.authenticate();
        console.log('Connected to TiDB/MySQL.');

        // 1. Sync Sequelize Models (User)
        console.log('\nSyncing User model (using alter: true)...');
        await User.sync({ alter: true });
        console.log('User model synchronized.');

        // 2. Deep Sync for Raw-SQL tables
        const tableDefinitions = {
            activities: [
                { name: 'host_email', def: 'VARCHAR(255)' },
                { name: 'category', def: 'VARCHAR(50)' },
                { name: 'title', def: 'VARCHAR(255)' },
                { name: 'sport_type', def: 'VARCHAR(100)' },
                { name: 'people_needed', def: 'INT' },
                { name: 'event_time', def: 'DATETIME' },
                { name: 'deadline', def: 'DATETIME' },
                { name: 'location', def: 'VARCHAR(255)' },
                { name: 'description', def: 'TEXT' },
                { name: 'status', def: "VARCHAR(50) DEFAULT 'open'" },
                { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ],
            carpools: [
                { name: 'host_email', def: 'VARCHAR(255)' },
                { name: 'host_name', def: 'VARCHAR(100)' },
                { name: 'host_dept', def: 'VARCHAR(100)' },
                { name: 'title', def: 'VARCHAR(255)' },
                { name: 'departure_loc', def: 'VARCHAR(255)' },
                { name: 'destination_loc', def: 'VARCHAR(255)' },
                { name: 'departure_time', def: 'DATETIME' },
                { name: 'deadline', def: 'DATETIME' },
                { name: 'available_seats', def: 'INT' },
                { name: 'price', def: 'VARCHAR(50)' },
                { name: 'vehicle_type', def: 'VARCHAR(50)' },
                { name: 'description', def: 'TEXT' },
                { name: 'status', def: "VARCHAR(50) DEFAULT 'open'" },
                { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ],
            studies: [
                { name: 'host_email', def: 'VARCHAR(255)' },
                { name: 'host_name', def: 'VARCHAR(100)' },
                { name: 'host_dept', def: 'VARCHAR(100)' },
                { name: 'title', def: 'VARCHAR(255)' },
                { name: 'event_type', def: 'VARCHAR(50)' },
                { name: 'subject', def: 'VARCHAR(100)' },
                { name: 'location', def: 'VARCHAR(255)' },
                { name: 'people_needed', def: 'INT' },
                { name: 'event_time', def: 'DATETIME' },
                { name: 'deadline', def: 'DATETIME' },
                { name: 'description', def: 'TEXT' },
                { name: 'status', def: "VARCHAR(50) DEFAULT 'open'" },
                { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ],
            hangouts: [
                { name: 'host_email', def: 'VARCHAR(255)' },
                { name: 'title', def: 'VARCHAR(255)' },
                { name: 'category', def: 'VARCHAR(100)' },
                { name: 'host_name', def: 'VARCHAR(100)' },
                { name: 'host_dept', def: 'VARCHAR(100)' },
                { name: 'people_needed', def: 'INT' },
                { name: 'event_time', def: 'DATETIME' },
                { name: 'deadline', def: 'DATETIME' },
                { name: 'meeting_location', def: 'VARCHAR(255)' },
                { name: 'destination', def: 'VARCHAR(255)' },
                { name: 'description', def: 'TEXT' },
                { name: 'status', def: "VARCHAR(50) DEFAULT 'open'" },
                { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ],
            housing: [
                { name: 'host_email', def: 'VARCHAR(255)' },
                { name: 'host_name', def: 'VARCHAR(100)' },
                { name: 'host_dept', def: 'VARCHAR(100)' },
                { name: 'housing_type', def: 'VARCHAR(50)' },
                { name: 'title', def: 'VARCHAR(255)' },
                { name: 'location', def: 'VARCHAR(255)' },
                { name: 'room_number', def: 'VARCHAR(50)' },
                { name: 'rent_amount', def: 'DECIMAL(10,2)' },
                { name: 'deposit', def: 'DECIMAL(10,2)' },
                { name: 'people_needed', def: 'INT' },
                { name: 'gender_req', def: 'VARCHAR(50)' },
                { name: 'deadline', def: 'DATETIME' },
                { name: 'rental_period', def: 'VARCHAR(100)' },
                { name: 'facilities', def: 'TEXT' },
                { name: 'habits', def: 'TEXT' },
                { name: 'description', def: 'TEXT' },
                { name: 'status', def: "VARCHAR(50) DEFAULT 'open'" },
                { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ],
            event_participants: [
                { name: 'event_type', def: 'VARCHAR(50)' },
                { name: 'event_id', def: 'INT' },
                { name: 'user_id', def: 'INT' },
                { name: 'status', def: "VARCHAR(50) DEFAULT 'pending'" },
                { name: 'snapshot_display_name', def: 'VARCHAR(255)' },
                { name: 'snapshot_avatar_url', def: 'TEXT' },
                { name: 'snapshot_bio', def: 'TEXT' },
                { name: 'version', def: 'INT DEFAULT 1' },
                { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
                { name: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
            ],
            system_notifications: [
                { name: 'recipient_id', def: 'INT' },
                { name: 'type', def: 'VARCHAR(50)' },
                { name: 'aggregate_id', def: 'VARCHAR(100)' },
                { name: 'link', def: 'TEXT' },
                { name: 'metadata', def: 'TEXT' },
                { name: 'action_metadata', def: 'TEXT' },
                { name: 'is_read', def: 'BOOLEAN DEFAULT FALSE' },
                { name: 'delivery_state', def: "VARCHAR(50) DEFAULT 'delivered'" },
                { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ],
            outbox_events: [
                { name: 'idempotency_key', def: 'VARCHAR(100) UNIQUE' },
                { name: 'aggregate_type', def: 'VARCHAR(50)' },
                { name: 'aggregate_id', def: 'VARCHAR(100)' },
                { name: 'type', def: 'VARCHAR(100)' },
                { name: 'payload', def: 'TEXT' },
                { name: 'status', def: "VARCHAR(50) DEFAULT 'pending'" },
                { name: 'retry_count', def: 'INT DEFAULT 0' },
                { name: 'last_attempt_at', def: 'TIMESTAMP NULL' },
                { name: 'error_message', def: 'TEXT' },
                { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ]
        };

        for (const [tableName, columns] of Object.entries(tableDefinitions)) {
            console.log(`\nChecking table: ${tableName}...`);
            
            // Get current columns
            let currentColumns = [];
            try {
                const [results] = await sequelize.query(`DESCRIBE ${tableName}`);
                currentColumns = results.map(r => r.Field.toLowerCase());
            } catch (e) {
                console.log(`Table ${tableName} does not exist? Will skip or fail.`);
                continue;
            }

            for (const col of columns) {
                if (!currentColumns.includes(col.name.toLowerCase())) {
                    console.log(`Adding missing column [${col.name}] to ${tableName}...`);
                    try {
                        await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.def}`);
                        console.log(`Successfully added ${col.name}.`);
                    } catch (err) {
                        console.error(`Failed to add ${col.name}: ${err.message}`);
                    }
                }
            }
        }

        console.log('\n--- DEEP SYNC COMPLETED SUCCESSFULLY ---');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

syncAll();
