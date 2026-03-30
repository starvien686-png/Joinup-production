const sequelize = require('./database');

async function checkHousingSchema() {
    try {
        const [results] = await sequelize.query('DESCRIBE housing');
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Error checking housing schema:', error);
    } finally {
        await sequelize.close();
    }
}

checkHousingSchema();
