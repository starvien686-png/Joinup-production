const sequelize = require('./database');

async function alterTable() {
    try {
        console.log('Adding is_edited column...');
        await sequelize.query('ALTER TABLE chat_messages ADD COLUMN is_edited TINYINT(1) DEFAULT 0');
        console.log('Successfully added is_edited column to chat_messages table.');
        process.exit(0);
    } catch (err) {
        if (err.message.includes('Duplicate column name')) {
            console.log('Column is_edited already exists.');
            process.exit(0);
        } else {
            console.error('Error adding column:', err.message);
            process.exit(1);
        }
    }
}

alterTable();
