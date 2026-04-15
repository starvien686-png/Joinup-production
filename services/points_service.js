const sequelize = require('../database');

const getEmailVariations = (email) => {
    if (!email) return [];
    if (email.endsWith('@mail1.ncnu.edu.tw')) return [email, email.replace('@mail1.ncnu.edu.tw', '@ncnu.edu.tw')];
    if (email.endsWith('@ncnu.edu.tw')) return [email, email.replace('@ncnu.edu.tw', '@mail1.ncnu.edu.tw')];
    return [email];
};

/**
 * Award/Deduct Credit Points (信用積分)
 */
async function awardCreditPoint(email, points) {
    if (!email) return;
    console.log(`[Credit] Attempting to award ${points} to ${email}`);
    try {
        const emails = getEmailVariations(email);
        console.log(`[Credit] Emails variations: ${emails}`);
        await sequelize.query('UPDATE users SET credit_points = GREATEST(0, credit_points + ?) WHERE email IN (?)', {
            replacements: [points, emails]
        });
        console.log(`[Credit] Updated DB. Awarded ${points} pts to ${email}.`);
    } catch (error) {
        console.error(`[Credit] FAIL:`, error);
    }
}

/**
 * Award Violation Points (違規點數)
 * Rule: 3 points = AUTO-BANNED (Suspended).
 */
async function awardViolationPoint(email, points, reason, adminEmail = null) {
    if (!email) return;
    console.log(`[Violation] Attempting to award ${points} to ${email} for: ${reason}`);
    try {
        const emails = getEmailVariations(email);
        
        // 1. Record in violation_logs
        console.log(`[Violation] Inserting log...`);
        await sequelize.query(
            `INSERT INTO violation_logs (id, user_email, points, type, reason, admin_email, created_at)
             VALUES (UUID(), ?, ?, ?, ?, ?, NOW())`, {
            replacements: [email, points, adminEmail ? 'manual' : 'automated', reason, adminEmail]
        });

        // 2. Update user violation points
        console.log(`[Violation] Updating user points...`);
        await sequelize.query('UPDATE users SET violation_points = violation_points + ? WHERE email IN (?)', {
            replacements: [points, emails]
        });

        // 3. Check for AUTO-BAN
        console.log(`[Violation] Checking for ban...`);
        const [results] = await sequelize.query('SELECT violation_points FROM users WHERE email IN (?)', {
            replacements: [emails]
        });

        console.log(`[Violation] Current points for ${email}: ${results.length > 0 ? results[0].violation_points : 'NOT FOUND'}`);

        if (results.length > 0 && results[0].violation_points >= 3) {
            console.log(`[Violation] Threshold reached! Banning...`);
            await sequelize.query("UPDATE users SET status = 'suspended' WHERE email IN (?)", {
                replacements: [emails]
            });
            console.log(`[Violation] USER BANNED: ${email} reached ${results[0].violation_points} points.`);
        }

        console.log(`[Violation] Success: Added ${points} pts to ${email}.`);
    } catch (error) {
        console.error(`[Violation] FAIL:`, error);
    }
}


module.exports = {
    awardCreditPoint,
    awardViolationPoint,
    getEmailVariations
};
