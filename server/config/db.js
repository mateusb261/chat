const { Sequelize } = require('sequelize');

// Configuração para o banco de dados MySQL
const sequelize = new Sequelize('chat', 'root', '@1Sql', {
    host: 'localhost', // ou o endereço IP do seu servidor MySQL
    dialect: 'mysql',
});

// Teste de conexão com o banco de dados
sequelize.authenticate()
    .then(() => {
        console.log('Conexão ao banco de dados foi bem-sucedida!');
    })
    .catch((error) => {
        console.error('Não foi possível conectar ao banco de dados:', error);
    });

module.exports = sequelize;
