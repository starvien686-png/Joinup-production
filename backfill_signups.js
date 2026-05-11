const sequelize = require('./database');
const { QueryTypes } = require('sequelize');

async function backfillSignups() {
    console.log('🚀 Starting Data Backfill: Estimating User Signup Dates...');

    try {
        // 1. Get all users
        const users = await sequelize.query('SELECT id, email FROM users', { type: QueryTypes.SELECT });
        console.log(`📊 Found ${users.length} users to process.`);

        let updatedCount = 0;

        for (const user of users) {
            const email = user.email.toLowerCase().trim();
            const userId = user.id;

            // 2. Find earliest activity in chat_messages
            const [chatResult] = await sequelize.query(
                'SELECT MIN(created_at) as earliest FROM chat_messages WHERE LOWER(sender_email) = ?',
                { replacements: [email], type: QueryTypes.SELECT }
            );

            // 3. Find earliest activity in event_participants
            const [partResult] = await sequelize.query(
                'SELECT MIN(created_at) as earliest FROM event_participants WHERE user_id = ?',
                { replacements: [userId], type: QueryTypes.SELECT }
            );

            // 3.1 Find earliest activity in chat_participants
            const [chatPartResult] = await sequelize.query(
                'SELECT MIN(created_at) as earliest FROM chat_participants WHERE LOWER(user_email) = ?',
                { replacements: [email], type: QueryTypes.SELECT }
            );

            const chatEarliest = chatResult ? chatResult.earliest : null;
            const partEarliest = partResult ? partResult.earliest : null;
            const chatPartEarliest = chatPartResult ? chatPartResult.earliest : null;

            // 4. Determine the absolute minimum
            const dates = [chatEarliest, partEarliest, chatPartEarliest].filter(d => d !== null).map(d => new Date(d));
            let finalEarliest = dates.length > 0 ? new Date(Math.min(...dates)) : null;

            if (finalEarliest) {
                // 5. Update user
                await sequelize.query(
                    'UPDATE users SET created_at = ? WHERE id = ?',
                    { replacements: [finalEarliest, userId], type: QueryTypes.UPDATE }
                );
                updatedCount++;
                if (updatedCount % 50 === 0) console.log(`✅ Processed ${updatedCount} users...`);
            }
        }

        console.log(`✨ Backfill complete! Updated ${updatedCount} users with estimated signup dates.`);
    } catch (error) {
        console.error('❌ Backfill failed:', error);
    } finally {
        await sequelize.close();
    }
}

backfillSignups();
