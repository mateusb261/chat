const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

// Configura as rotas de autenticação e chat
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

// Inicializa o socket.io para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('Um usuário se conectou.');

    // Aqui você pode configurar o gerenciamento de mensagens
    socket.on('disconnect', () => {
        console.log('Um usuário se desconectou.');
    });
});

// Inicia o servidor na porta desejada
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
