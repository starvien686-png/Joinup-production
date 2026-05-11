const sequelize = require('./database');
const { QueryTypes } = require('sequelize');

async function backfillSignups() {
    console.log('🚀 Starting Data Backfill: Estimating User Signup Dates...');

    try {
        // 1. Get all users
        const users = await sequelize.query('SELECT id, email FROM users', { type: QueryTypes.SELECT });
        console.log(`📊 Found ${users.length} users to process.`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            const email = user.email.toLowerCase().trim();
            const userId = user.id;

            // 2. Find earliest activity in chat_messages
            const chatResult = await sequelize.query(
                'SELECT MIN(created_at) as earliest FROM chat_messages WHERE LOWER(sender_email) = ?',
                { replacements: [email], type: QueryTypes.SELECT }
            ).catch(err => { console.error(`[Skip] chat_messages error for ${email}:`, err.message); return [{}]; });

            // 3. Find earliest activity in event_participants
            const partResult = await sequelize.query(
                'SELECT MIN(created_at) as earliest FROM event_participants WHERE user_id = ?',
                { replacements: [userId], type: QueryTypes.SELECT }
            ).catch(err => { console.error(`[Skip] event_participants error for ${userId}:`, err.message); return [{}]; });

            // 4. Find earliest activity in chat_rooms via participants
            const roomResult = await sequelize.query(
                'SELECT MIN(r.created_at) as earliest FROM chat_rooms r JOIN chat_participants p ON r.room_id = p.room_id WHERE LOWER(p.user_email) = ?',
                { replacements: [email], type: QueryTypes.SELECT }
            ).catch(err => { console.error(`[Skip] chat_rooms error for ${email}:`, err.message); return [{}]; });

            const chatEarliest = chatResult[0]?.earliest;
            const partEarliest = partResult[0]?.earliest;
            const roomEarliest = roomResult[0]?.earliest;

            // 5. Determine the absolute minimum
            const dates = [chatEarliest, partEarliest, roomEarliest]
                .filter(d => d !== null && d !== undefined)
                .map(d => new Date(d));

            let finalEarliest = dates.length > 0 ? new Date(Math.min(...dates)) : null;

            if (finalEarliest) {
                // 5. Update user
                await sequelize.query(
                    'UPDATE users SET created_at = ? WHERE id = ?',
                    { replacements: [finalEarliest, userId], type: QueryTypes.UPDATE }
                );
                updatedCount++;
            } else {
                skippedCount++;
            }
            
            if ((updatedCount + skippedCount) % 5 === 0) {
                console.log(`⏳ Progress: ${(updatedCount + skippedCount)}/${users.length} (Updated: ${updatedCount}, No Activity: ${skippedCount})`);
            }
        }

        console.log(`✨ Backfill complete!`);
        console.log(`✅ Updated: ${updatedCount} users with estimated signup dates.`);
        console.log(`ℹ️ Skipped: ${skippedCount} users (No activity found in chat/events).`);
    } catch (error) {
        console.error('❌ Backfill failed:', error);
    } finally {
        await sequelize.close();
    }
}

backfillSignups();
