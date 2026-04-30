const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('joinup', 'root', 'Vicdata.base8', {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
});

async function checkSchema() {
    try {
        const [results] = await sequelize.query("DESCRIBE event_participants");
        console.log("event_participants schema:");
        console.table(results);
        
        const [results2] = await sequelize.query("DESCRIBE chat_participants");
        console.log("chat_participants schema:");
        console.table(results2);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

checkSchema();
