const sequelize = require('./database');
const User = require('./User');

async function syncDatabase() {
    try {
        // Ini perintah untuk mencocokkan kodingan kita dengan tabel di MySQL
        await sequelize.sync();
        console.log('Success: Database & Tables are synced and ready for Sign Up/Login!');
    } catch (error) {
        console.error('Error syncing database:', error);
    } finally {
        process.exit(); // Biar terminalnya otomatis berhenti kalau sudah selesai
    }
}

syncDatabase();