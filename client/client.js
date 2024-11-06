const readline = require('readline');
const io = require('socket.io-client');
const { SERVER_URL } = require('./config/config');
const { generateKeys } = require('./utils/ecc');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para autenticação de usuário
const authenticateUser = async (username, password) => {
    const response = await fetch(`${SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return response.json();
};

// Função para cadastro de usuário
const registerUser = async (username, password) => {
    const response = await fetch(`${SERVER_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return response.json();
};

// Função principal para iniciar o chat após o login
const startChat = async (username) => {
    // Obter chave pública do servidor
    const publicKeyResponse = await fetch(`${SERVER_URL}/chat/publicKey/${username}`);
    const publicKeyData = await publicKeyResponse.json();
    const publicKey = publicKeyData.publicKey;

    // Gerar chave privada para a sessão atual
    const { privateKey } = generateKeys();

    // Conexão com o servidor de chat
    const socket = io(SERVER_URL);

    socket.on('message', (data) => {
        const decryptedMessage = decryptMessage(data.encryptedMessage, privateKey);
        console.log(`Mensagem recebida: ${decryptedMessage}`);
    });

    rl.question('Digite sua mensagem: ', (message) => {
        const encryptedMessage = encryptMessage(message, publicKey);
        socket.emit('message', { encryptedMessage });
        rl.close();
    });

    socket.on('connect', () => {
        console.log('Conectado ao servidor.');
    });

    socket.on('disconnect', () => {
        console.log('Desconectado do servidor.');
    });
};

// Função para escolher entre cadastro ou login
const startApp = () => {
    rl.question('Escolha uma opção:\n1 - Cadastrar Usuário\n2 - Fazer Login\nEscolha: ', (choice) => {
        if (choice === '1') {
            rl.question('Digite seu nome de usuário: ', (username) => {
                rl.question('Digite sua senha: ', (password) => {
                    registerUser(username, password).then(response => {
                        if (response.error) {
                            console.error('Erro no cadastro:', response.error);
                        } else {
                            console.log('Cadastro realizado com sucesso!');
                        }
                        rl.close();
                    });
                });
            });
        } else if (choice === '2') {
            rl.question('Digite seu nome de usuário: ', (username) => {
                rl.question('Digite sua senha: ', (password) => {
                    authenticateUser(username, password).then(authResponse => {
                        if (authResponse.error) {
                            console.error('Erro no login:', authResponse.error);
                        } else {
                            console.log('Login bem-sucedido!');
                            startChat(username);
                        }
                    });
                });
            });
        } else {
            console.log('Opção inválida.');
            rl.close();
        }
    });
};

// Inicia o programa
startApp();
