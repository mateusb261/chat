const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Definir o modelo de usuário
const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Garante que o nome de usuário será único
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    public_key: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    timestamps: true, // Usar o timestamp para criar os campos createdAt e updatedAt automaticamente
});

module.exports = User;
