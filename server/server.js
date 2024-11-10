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
const chatSessions = {}; // Armazenar os pares de chaves públicas de cada sessão de chat

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

    // Solicitação de chave pública
    socket.on('requestPublicKey', (targetUser, callback) => {
        const targetSocket = Object.keys(connectedUsers).find(id => connectedUsers[id] === targetUser);
        if (targetSocket) {
            // Aqui você pode fornecer a chave pública do usuário alvo (supondo que ela esteja armazenada no banco de dados)
            // No exemplo, o código assume que as chaves públicas estão armazenadas no lado do cliente.
            const publicKey = chatSessions[targetSocket]?.publicKey; // Verifica se a chave pública foi armazenada corretamente
            if (publicKey) {
                callback(publicKey); // Envia a chave pública para o cliente
            } else {
                console.error('Chave pública não encontrada para o usuário:', targetUser);
                callback(null); // Se a chave pública não for encontrada, retorna null
            }
        } else {
            console.error('Usuário não encontrado:', targetUser);
            callback(null); // Se o usuário não for encontrado, retorna null
        }
    });

    // Envio de mensagem criptografada
    socket.on('message', (data) => {
        const { to, encryptedMessage } = data;

        // Enviar mensagem criptografada para o usuário destinatário
        const targetSocket = Object.keys(connectedUsers).find(id => connectedUsers[id] === to);
        if (targetSocket) {
            socket.to(targetSocket).emit('newMessage', { from: connectedUsers[socket.id], encryptedMessage });
        }
    });

    // Criar ou manter canal de criptografia
    socket.on('startChat', (targetUser, publicKey) => {
        chatSessions[socket.id] = { publicKey: publicKey, targetUser: targetUser };
        console.log(`Canal de chat iniciado entre ${connectedUsers[socket.id]} e ${targetUser}`);
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
