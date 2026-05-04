const sequelize = require('../database');

async function testQuery() {
    try {
        const query = `
            SELECT 
                a.id, a.title, COALESCE(a.category, 'sports') as category, a.people_needed, a.host_email, a.status, a.created_at,
                (SELECT COUNT(*) FROM event_participants ep JOIN users u_ghost ON ep.user_id = u_ghost.id WHERE LOWER(ep.event_type) = 'sports' AND ep.event_id = a.id AND LOWER(ep.status) IN ('approved', 'accepted') AND LOWER(u_ghost.email) != 'ncnujoinupadmin@gmail.com') as approvedCount
            FROM activities a
            WHERE a.status NOT IN ('deleted', 'cancelled')
            LIMIT 5
        `;
        const [results] = await sequelize.query(query);
        console.log("Query Results:", results);
        process.exit(0);
    } catch (err) {
        console.error("Query Error:", err);
        process.exit(1);
    }
}
testQuery();
