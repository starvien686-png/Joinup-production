const { DataTypes } = require('sequelize');
const sequelize = require('./database'); // Memanggil koneksi database kamu

const User = sequelize.define('user', {
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    major: {
        type: DataTypes.STRING
    },
    study_year: {
        type: DataTypes.INTEGER
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'bachelor_student'
    },
    // 👇 INI DIA 3 LACI ABADI YANG BIKIN DATA KAMU HILANG KEMARIN 👇
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    hobby: {
        type: DataTypes.STRING,
        allowNull: true
    },
    profile_pic: {
        type: DataTypes.TEXT('long'), // Pakai long-text biar foto HD muat!
        allowNull: true
    },
    credit_points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    is_delayed_graduation: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'users',
    timestamps: false // Sesuai dengan settingan MySQL bawaanmu
});

module.exports = User;