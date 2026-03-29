const sequelize = require('./database');
async function run() {
    try {
        const [results] = await sequelize.query('DESCRIBE users');
        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
