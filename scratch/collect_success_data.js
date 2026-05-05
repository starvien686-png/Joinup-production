const sequelize = require('../database');
const fs = require('fs');

async function collectSuccessData() {
    try {
        const tables = [
            { name: 'activities', type: 'sports' },
            { name: 'carpools', type: 'carpool' },
            { name: 'studies', type: 'study' },
            { name: 'hangouts', type: 'hangout' },
            { name: 'housing', type: 'housing' }
        ];

        let combinedData = [];

        for (const tableInfo of tables) {
            console.log(`Processing table: ${tableInfo.name}...`);
            
            // 1. Get successful events
            const [events] = await sequelize.query(`
                SELECT e.*, u.username as host_name 
                FROM ${tableInfo.name} e
                LEFT JOIN users u ON LOWER(e.host_email) = LOWER(u.email)
                WHERE e.status = 'success'
            `);

            for (const event of events) {
                // 2. Get participants for this event
                const [participants] = await sequelize.query(`
                    SELECT u.username, u.email
                    FROM event_participants ep
                    JOIN users u ON ep.user_id = u.id
                    WHERE ep.event_id = ? AND ep.event_type = ? AND ep.status IN ('approved', 'accepted')
                `, {
                    replacements: [event.id, tableInfo.type]
                });

                combinedData.push({
                    activity_id: event.id,
                    category: tableInfo.type,
                    title: event.title,
                    host_name: event.host_name || 'Unknown',
                    host_email: event.host_email,
                    participant_count: participants.length + 1, // +1 for host
                    participants: participants.map(p => ({ name: p.username, email: p.email })),
                    event_time: event.event_time || event.departure_time || 'N/A'
                });
            }
        }

        console.log(`\nSuccessfully collected ${combinedData.length} successful activities.`);
        
        // Write to file
        const outputPath = './scratch/successful_activities_data.json';
        fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));
        console.log(`Data saved to: ${outputPath}`);

        // Print a summary table
        if (combinedData.length > 0) {
            console.log('\nSummary:');
            console.table(combinedData.map(d => ({
                Title: d.title,
                Host: d.host_name,
                Type: d.category,
                Participants: d.participant_count
            })));
        }

    } catch (error) {
        console.error('Error collecting data:', error);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

collectSuccessData();
