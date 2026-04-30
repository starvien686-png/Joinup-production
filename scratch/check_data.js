const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('joinup', 'root', 'Vicdata.base8', {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
});

async function checkData() {
    try {
        const [users] = await sequelize.query("SELECT COUNT(*) as count FROM users");
        console.log("Total users:", users[0].count);
        
        const [results2] = await sequelize.query("SELECT * FROM chat_participants ORDER BY id DESC LIMIT 5");
        console.log("Recent chat participants:");
        console.table(results2);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

checkData();
