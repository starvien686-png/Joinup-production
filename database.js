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
        logging: console.log, // Enable verbose logging to see connection issues
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000,
            handleDisconnects: true
        },
        dialectOptions: {
            connectTimeout: 10000, // Force timeout after 10 seconds!
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: false // Set to false because of self-signed certificate in certificate chain error
            },
            dateStrings: true,
            typeCast: function (field, next) {
                if (field.type === 'DATETIME' || field.type === 'TIMESTAMP' || field.type === 'DATE') {
                    return field.string();
                }
                return next();
            }
        },
        retry: {
            max: 3
        },
        hooks: {
            afterConnect: (connection, config) => {
                return new Promise((resolve, reject) => {
                    connection.query("SET time_zone = '+08:00';", (err) => {
                        if (err) {
                            console.error("Failed to set time_zone", err);
                            return reject(err);
                        }
                        resolve();
                    });
                });
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