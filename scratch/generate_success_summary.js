const sequelize = require('../database');

async function createSuccessSummaryTable() {
    try {
        console.log('--- Creating Successful Activity Summary Table ---');
        
        // 1. Create the summary table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS successful_activity_summaries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                activity_id INT NOT NULL,
                category VARCHAR(50),
                title VARCHAR(255),
                host_name VARCHAR(255),
                host_email VARCHAR(255),
                participant_count INT,
                participants_json TEXT, -- JSON string of participant names and emails
                event_time VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "successful_activity_summaries" ensured.');

        const tables = [
            { name: 'activities', type: 'sports' },
            { name: 'carpools', type: 'carpool' },
            { name: 'studies', type: 'study' },
            { name: 'hangouts', type: 'hangout' },
            { name: 'housing', type: 'housing' }
        ];

        let totalProcessed = 0;

        for (const tableInfo of tables) {
            console.log(`Scanning ${tableInfo.name} for successful events...`);
            
            // 2. Get successful events
            const [events] = await sequelize.query(`
                SELECT e.*, u.username as host_name 
                FROM ${tableInfo.name} e
                LEFT JOIN users u ON LOWER(e.host_email) = LOWER(u.email)
                WHERE e.status = 'success'
            `);

            for (const event of events) {
                // 3. Get participants for this event
                const [participants] = await sequelize.query(`
                    SELECT u.username, u.email
                    FROM event_participants ep
                    JOIN users u ON ep.user_id = u.id
                    WHERE ep.event_id = ? AND ep.event_type = ? AND ep.status IN ('approved', 'accepted')
                `, {
                    replacements: [event.id, tableInfo.type]
                });

                const participantNames = participants.map(p => ({ name: p.username, email: p.email }));
                const participantCount = participants.length + 1; // +1 for host

                // 4. Insert into summary table
                await sequelize.query(`
                    INSERT INTO successful_activity_summaries 
                    (activity_id, category, title, host_name, host_email, participant_count, participants_json, event_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, {
                    replacements: [
                        event.id, 
                        tableInfo.type, 
                        event.title, 
                        event.host_name || 'Unknown', 
                        event.host_email, 
                        participantCount, 
                        JSON.stringify(participantNames),
                        event.event_time || event.departure_time || 'N/A'
                    ]
                });
                totalProcessed++;
            }
        }

        console.log(`\nProcess finished. Total successful activities summarized: ${totalProcessed}`);

    } catch (error) {
        console.error('Critical Error during summary generation:', error);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

createSuccessSummaryTable();
