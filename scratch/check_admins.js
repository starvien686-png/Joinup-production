const sequelize = require('./database');
const User = require('./User');

async function audit() {
    try {
        const users = await User.findAll({ where: { is_admin: 1 } });
        console.log('Admins in DB:', users.map(u => u.email));
        
        const allUsers = await User.findAll();
        console.log('Total users:', allUsers.length);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
audit();
