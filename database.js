const { Sequelize } = require('sequelize');

// Format: new Sequelize('database_name', 'username', 'password', ...)
const sequelize = new Sequelize(
    process.env.DB_NAME || 'joinup', 
    process.env.DB_USER || 'root', 
    process.env.DB_PASS || 'Vicdata.base8', 
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        timezone: '+08:00',
        logging: false,
        dialectOptions: {
            ssl: {
                rejectUnauthorized: false
            },
            dateStrings: true,
            typeCast: function (field, next) {
                if (field.type === 'DATETIME' || field.type === 'TIMESTAMP' || field.type === 'DATE') {
                    return field.string();
                }
                return next();
            }
        }
    }
);

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Success: Connection to the JoinUp database has been established successfully.');
    } catch (error) {
        console.error('Error: Unable to connect to the database. Please check your password or connection:', error);
    }
}

testConnection();

module.exports = sequelize;