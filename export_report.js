const sequelize = require('./database');
const fs = require('fs');

async function exportReport() {
    try {
        console.log('--- Generating Successful Events Report ---');
        
        const query = `
            SELECT 
                e.category_label AS Category,
                e.title AS Event_Name,
                u_host.username AS Host_Name,
                e.host_email AS Host_Email,
                e.event_time AS Event_Date,
                e.deadline AS Deadline,
                (SELECT COUNT(*) + 1 FROM event_participants ep WHERE ep.event_id = e.id AND ep.event_type = e.type AND ep.status IN ('approved', 'accepted')) AS Total_Participants,
                CONCAT(u_host.username, COALESCE((
                    SELECT CONCAT(', ', GROUP_CONCAT(u.username SEPARATOR ', '))
                    FROM event_participants ep 
                    JOIN users u ON ep.user_id = u.id 
                    WHERE ep.event_id = e.id AND ep.event_type = e.type AND ep.status IN ('approved', 'accepted')
                ), '')) AS Participant_Names
            FROM (
                SELECT 'Sports/Activity' as category_label, title, host_email, event_time, deadline, status, id, 'activity' as type FROM activities WHERE status IN ('success', 'Success')
                UNION ALL
                SELECT 'Carpool' as category_label, title, host_email, departure_time as event_time, deadline, status, id, 'carpool' as type FROM carpools WHERE status IN ('success', 'Success')
                UNION ALL
                SELECT 'Study' as category_label, title, host_email, event_time, deadline, status, id, 'study' as type FROM studies WHERE status IN ('success', 'Success')
                UNION ALL
                SELECT 'Hangout' as category_label, title, host_email, event_time, deadline, status, id, 'hangout' as type FROM hangouts WHERE status IN ('success', 'Success')
                UNION ALL
                SELECT 'Housing' as category_label, title, host_email, deadline as event_time, deadline, status, id, 'housing' as type FROM housing WHERE status IN ('success', 'Success')
            ) AS e
            JOIN users u_host ON LOWER(e.host_email) = LOWER(u_host.email)
            ORDER BY e.event_time DESC;
        `;

        const [results] = await sequelize.query(query);

        if (results.length === 0) {
            console.log('No successful events found.');
            return;
        }

        // Generate CSV content
        const headers = Object.keys(results[0]).join(',');
        const rows = results.map(row => {
            return Object.values(row).map(val => {
                // Escape commas and quotes for CSV
                const stringVal = String(val || '');
                return `"${stringVal.replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\n');

        const csvContent = `${headers}\n${rows}`;
        const fileName = 'laporan_event_sukses.csv';
        
        fs.writeFileSync(fileName, '\ufeff' + csvContent); // Add UTF-8 BOM for Excel
        console.log(`\n✅ Success! Report saved as: ${fileName}`);
        console.log(`Total events exported: ${results.length}`);
        
    } catch (err) {
        console.error('\n❌ Export failed:', err.message);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

exportReport();
