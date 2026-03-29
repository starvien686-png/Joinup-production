const sequelize = require('./database');

async function migrate() {
    try {
        // 1. event_participants
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS event_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL DEFAULT 'activity',
                event_id INT NOT NULL,
                user_id INT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                version INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_participation (event_type, event_id, user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 2. system_notifications
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS system_notifications (
                id VARCHAR(36) PRIMARY KEY,
                recipient_id INT NOT NULL,
                type VARCHAR(100) NOT NULL,
                metadata JSON,
                is_read BOOLEAN DEFAULT FALSE,
                delivery_state VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 3. outbox_events
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS outbox_events (
                id VARCHAR(36) PRIMARY KEY,
                aggregate_type VARCHAR(100) NOT NULL,
                aggregate_id VARCHAR(100) NOT NULL,
                type VARCHAR(100) NOT NULL,
                payload JSON,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. audit_logs
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id VARCHAR(36) PRIMARY KEY,
                action VARCHAR(100) NOT NULL,
                actor_id INT,
                event_id INT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("Migration executed successfully!");
        process.exit(0);
    } catch(e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}
migrate();
