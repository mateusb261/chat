const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');  // Adicionado o CORS
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',  // Permitir todas as origens (substitua pelo seu domínio em produção)
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    }
});

// Definir a porta para o servidor
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Middleware CORS
app.use(cors());  // Habilita o CORS para todas as rotas

// Configura as rotas de autenticação e chat
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

// Armazena usuários conectados
const connectedUsers = {};

// Inicializa o socket.io para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('Um host se conectou.');

    // Evento de login
    socket.on('login', (username) => {
        // Armazena o usuário com o ID do socket
        connectedUsers[socket.id] = username;

        // Filtra outros usuários conectados
        const otherUsers = Object.values(connectedUsers).filter(user => user !== username);

        // Envia a lista de outros usuários conectados
        socket.emit('activeUsers', otherUsers);

        console.log(`${username} fez login. Usuários conectados: ${Object.values(connectedUsers)}`);
    });

    // Evento de desconexão
    socket.on('disconnect', () => {
        const username = connectedUsers[socket.id];
        if (username) {
            console.log(`${username} se desconectou.`);
            delete connectedUsers[socket.id];
        }
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
