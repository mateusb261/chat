const readline = require('readline');
const io = require('socket.io-client');
const { SERVER_URL } = require('./config/config');
const { generateKeys } = require('./utils/ecc');

// Configuração do readline para capturar entrada do usuário
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para autenticação
const authenticateUser = async (username, password) => {
    const response = await fetch(`${SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return response.json();
};

// Função para obter chave pública do servidor
const getPublicKey = async (username) => {
    const response = await fetch(`${SERVER_URL}/chat/publicKey/${username}`);
    return response.json();
};

// Função principal
const startChat = async () => {
    rl.question('Digite seu nome de usuário: ', async (username) => {
        rl.question('Digite sua senha: ', async (password) => {

            // Autenticação
            const authResponse = await authenticateUser(username, password);
            if (authResponse.error) {
                console.error(authResponse.error);
                rl.close();
                return;
            }

            console.log('Login bem-sucedido!');

            // Obter chave pública do usuário
            const publicKeyResponse = await getPublicKey(username);
            const publicKey = publicKeyResponse.publicKey;

            // Gerar chave privada para a sessão atual
            const { privateKey } = generateKeys();

            // Lidar com mensagens enviadas
            const socket = io(SERVER_URL);

            socket.on('message', (data) => {
                const decryptedMessage = decryptMessage(data.encryptedMessage, privateKey);
                console.log(`Mensagem recebida: ${decryptedMessage}`);
            });

            // Enviar mensagem
            rl.question('Digite sua mensagem: ', (message) => {
                const encryptedMessage = encryptMessage(message, publicKey);
                socket.emit('message', { encryptedMessage });
                rl.close(); // Fecha a interface após enviar a mensagem
            });

            // Conexão do socket
            socket.on('connect', () => {
                console.log('Conectado ao servidor.');
            });

            socket.on('disconnect', () => {
                console.log('Desconectado do servidor.');
            });
        });
    });
};

// Inicia o chat
startChat();
