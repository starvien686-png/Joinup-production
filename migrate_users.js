const sequelize = require('./database');

const getEmailVariations = (email) => {
    if (!email) return [];
    if (email.endsWith('@mail1.ncnu.edu.tw')) return [email, email.replace('@mail1.ncnu.edu.tw', '@ncnu.edu.tw')];
    if (email.endsWith('@ncnu.edu.tw')) return [email, email.replace('@ncnu.edu.tw', '@mail1.ncnu.edu.tw')];
    return [email];
};

const addColumnSafe = async (table, column, definition) => {
    try {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`[Migration] Added column ${column} to ${table}`);
    } catch (err) {
        if (!err.message.includes('Duplicate column name')) {
            console.error(`[Migration] Error adding ${column} to ${table}:`, err.message);
        } else {
            console.log(`[Migration] Column ${column} already exists in ${table}`);
        }
    }
};

async function migrate() {
    try {
        await addColumnSafe('users', 'is_delayed_graduation', 'TINYINT(1) DEFAULT 0');
        await addColumnSafe('users', 'violation_points', 'INT DEFAULT 0');
        await addColumnSafe('users', 'is_admin', 'TINYINT(1) DEFAULT 0');

        const admins = [
            's112212030@mail1.ncnu.edu.tw', 's112212025@mail1.ncnu.edu.tw',
            's112212026@mail1.ncnu.edu.tw', 's112212051@mail1.ncnu.edu.tw',
            's112212052@mail1.ncnu.edu.tw', 's112212060@mail1.ncnu.edu.tw'
        ];
        for (const email of admins) {
            const variants = getEmailVariations(email);
            await sequelize.query("UPDATE users SET is_admin = 1 WHERE email IN (?)", { replacements: [variants] });
            console.log(`Whitelisted: ${email}`);
        }
        console.log('Migration complete.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
migrate();
