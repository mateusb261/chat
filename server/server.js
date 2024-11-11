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
const connectedUsers = {}; // Formato: { socketId: { username, publicKey } }
const chatSessions = {}; // Armazenar os pares de chaves públicas de cada sessão de chat

// Inicializa o socket.io para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('Um host se conectou.');

    // Evento de login
    socket.on('login', (username, publicKey) => {
        // Armazena o usuário com o ID do socket
        connectedUsers[socket.id] = { username, publicKey };

        console.log(publicKey);

        // Filtra outros usuários conectados
        const otherUsers = Object.values(connectedUsers)
            .filter(user => user.username !== username)
            .map(user => user.username);

        // Envia a lista de outros usuários conectados
        socket.emit('activeUsers', otherUsers);

        //console.log(`${username} fez login. Usuários conectados: ${Object.values(connectedUsers).map(u => u.username)}`);
        console.log('Usuários conectados no servidor:', connectedUsers);  // Imprime a lista de usuários
    });

    // Evento de desconexão
    socket.on('disconnect', () => {
        const username = connectedUsers[socket.id];
        if (username) {
            console.log(`${username} se desconectou.`);
            delete connectedUsers[socket.id];
        }
    });

    // Solicitação de chave pública
    socket.on('requestPublicKey', (targetUser, callback) => {
        const target = Object.values(connectedUsers).find(user => user.username === targetUser);
        if (target && target.publicKey) {
            callback(target.publicKey); // Envia a chave pública para o cliente
        } else {
            console.error('Chave pública não encontrada para o usuário:', targetUser);
            callback(null); // Se a chave pública não for encontrada, retorna null
        }
    });


    // Evento de iniciar chat
    socket.on('startChat', (targetUser, publicKey) => {
        // Armazena a chave pública do remetente e do destinatário
        chatSessions[socket.id] = { publicKey, targetUser };
        const targetSocketId = Object.keys(connectedUsers).find(id => connectedUsers[id].username === targetUser);
        if (targetSocketId) {
            chatSessions[targetSocketId] = { publicKey, targetUser: connectedUsers[socket.id].username };
        }
        console.log(`Canal de chat iniciado entre ${connectedUsers[socket.id].username} e ${targetUser}`);
    });

    // Envio de mensagem criptografada
    socket.on('message', (data) => {
        const { to, message } = data;

        console.log(data);

        // Log para quando uma mensagem for recebida
        console.log(`Mensagem recebida de ${connectedUsers[socket.id].username} para ${to}: ${message.encryptedMessage}`);

        // Busca o socket do destinatário
        const targetSocket = Object.keys(connectedUsers).find(id => connectedUsers[id].username === to);
        if (targetSocket) {
            // Verifica se existe um canal de chat ativo
            const chatSession = chatSessions[socket.id] && chatSessions[targetSocket];

            console.log(chatSessions[socket.id]);
            console.log(chatSessions[targetSocket]);

            if (chatSession) {
                // Envia a mensagem criptografada para o destinatário
                socket.to(targetSocket).emit('newMessage', { from: connectedUsers[socket.id].username, message: message });
            } else {
                console.error('Canal de chat não iniciado corretamente.');
            }
        } else {
            console.error('Usuário destinatário não encontrado.');
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
