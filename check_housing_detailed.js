const sequelize = require('./database');
const fs = require('fs');

async function checkHousingSchema() {
    try {
        const [results] = await sequelize.query('DESCRIBE housing');
        fs.writeFileSync('housing_schema.json', JSON.stringify(results, null, 2));
        console.log("Housing schema extracted to housing_schema.json");
        process.exit(0);
    } catch (error) {
        console.error('Error checking housing schema:', error);
        process.exit(1);
    }
}

checkHousingSchema();
