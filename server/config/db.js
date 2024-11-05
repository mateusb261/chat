const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@1Sql',
    database: 'chat'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado ao banco de dados.');
});

module.exports = db;
