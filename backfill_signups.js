const sequelize = require('./database');
const { QueryTypes } = require('sequelize');

/**
 * Normalizes email by removing 'mail1.' and converting to lowercase.
 * This ensures consistency across tables.
 */
const normalizeEmail = (email) => {
    if (!email) return '';
    return email.toLowerCase().replace('mail1.', '').trim();
};

async function backfillSignups() {
    console.log('🚀 Starting Data Backfill V2: Deep Activity Scanning...');

    try {
        // 1. Get all users
        const users = await sequelize.query('SELECT id, email FROM users', { type: QueryTypes.SELECT });
        console.log(`📊 Found ${users.length} users to process.`);

        let updatedCount = 0;
        let skippedCount = 0;

        // Activity tables with host_email
        const eventTables = ['activities', 'carpools', 'hangouts', 'housing', 'studies'];

        for (const user of users) {
            const originalEmail = user.email;
            const cleanEmail = normalizeEmail(originalEmail);
            const userId = user.id;

            console.log(`🔍 Scanning activity for: ${originalEmail} (${cleanEmail})`);

            let activityDates = [];

            // A. Check event tables (Hosting)
            for (const table of eventTables) {
                const [result] = await sequelize.query(
                    `SELECT MIN(created_at) as earliest FROM ${table} WHERE LOWER(REPLACE(host_email, 'mail1.', '')) = ?`,
                    { replacements: [cleanEmail], type: QueryTypes.SELECT }
                ).catch(() => [{}]);
                if (result && result.earliest) activityDates.push(new Date(result.earliest));
            }

            // B. Check chat_messages (Sending)
            const [chatResult] = await sequelize.query(
                `SELECT MIN(created_at) as earliest FROM chat_messages WHERE LOWER(REPLACE(sender_email, 'mail1.', '')) = ?`,
                { replacements: [cleanEmail], type: QueryTypes.SELECT }
            ).catch(() => [{}]);
            if (chatResult && chatResult.earliest) activityDates.push(new Date(chatResult.earliest));

            // C. Check event_participants (Joining)
            const [partResult] = await sequelize.query(
                `SELECT MIN(created_at) as earliest FROM event_participants WHERE user_id = ?`,
                { replacements: [userId], type: QueryTypes.SELECT }
            ).catch(() => [{}]);
            if (partResult && partResult.earliest) activityDates.push(new Date(partResult.earliest));

            // D. Check chat_rooms via participants (Joining)
            const [roomResult] = await sequelize.query(
                `SELECT MIN(r.created_at) as earliest FROM chat_rooms r 
                 JOIN chat_participants p ON r.room_id = p.room_id 
                 WHERE LOWER(REPLACE(p.user_email, 'mail1.', '')) = ?`,
                { replacements: [cleanEmail], type: QueryTypes.SELECT }
            ).catch(() => [{}]);
            if (roomResult && roomResult.earliest) activityDates.push(new Date(roomResult.earliest));

            // Determine the absolute minimum
            if (activityDates.length > 0) {
                const finalEarliest = new Date(Math.min(...activityDates));
                
                // Update user
                await sequelize.query(
                    'UPDATE users SET created_at = ? WHERE id = ?',
                    { replacements: [finalEarliest, userId], type: QueryTypes.UPDATE }
                );
                updatedCount++;
                console.log(`   ✅ Matched! Earliest: ${finalEarliest.toISOString()}`);
            } else {
                // Fallback for users with no activity (jangan kosong ataupun hari ini)
                const fallbackDate = new Date('2026-05-01T00:00:00Z');
                await sequelize.query(
                    'UPDATE users SET created_at = ? WHERE id = ?',
                    { replacements: [fallbackDate, userId], type: QueryTypes.UPDATE }
                );
                skippedCount++;
                console.log(`   ⚠️ No activity found. Backfilled with fallback date: ${fallbackDate.toISOString()}`);
            }
        }

        console.log('\n✨ Backfill complete!');
        console.log(`✅ Updated: ${updatedCount} users.`);
        console.log(`ℹ️ Skipped: ${skippedCount} users (Total ghosts).`);
    } catch (error) {
        console.error('❌ Backfill failed:', error);
    } finally {
        await sequelize.close();
    }
}

backfillSignups();
