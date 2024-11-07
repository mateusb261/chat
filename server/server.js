const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Definir a porta para o servidor
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Configura as rotas de autenticação e chat
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

// Inicializa o socket.io para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('Um usuário se conectou.');

    socket.on('disconnect', () => {
        console.log('Um usuário se desconectou.');
    });
});

// Sincroniza o banco de dados
db.sync({ force: false }).then(() => {
    console.log('Banco de dados sincronizado!');
}).catch((err) => {
    console.error('Erro ao sincronizar o banco de dados:', err);
});

// Inicia o servidor, ouvindo em todas as interfaces de rede (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
