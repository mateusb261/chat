const readline = require('readline');
const io = require('socket.io-client');
const { SERVER_URL } = require('./config/config');
const { generateKeys } = require('./utils/ecc');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Conecta imediatamente ao servidor de chat
const socket = io(SERVER_URL);

// Mensagem ao conectar com sucesso
socket.on('connect', () => {
    console.log('Conectado ao servidor de chat com sucesso.');
    // Chama a função de menu após a conexão ser bem-sucedida
    startApp();
});

// Mensagem ao desconectar do servidor
socket.on('disconnect', () => {
    console.log('Desconectado do servidor.');
});

// Mensagem ao falhar a conexão
socket.on('connect_error', (error) => {
    console.error('Falha ao conectar ao servidor:', error.message);
    // Se a conexão falhar, termina a execução
    rl.close();
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

// Função para cadastro de usuário (incluindo chave pública)
const registerUser = async (username, password) => {
    // Gerar chave pública e privada no cliente
    const { publicKey, privateKey } = generateKeys();

    // Imprimir nome de usuário, senha e chave pública no terminal
    console.log(`Cadastro de Usuário:`);
    console.log(`Nome de Usuário: ${username}`);
    console.log(`Senha: ${password}`);
    console.log(`Chave Pública: ${publicKey}`);

    const response = await fetch(`${SERVER_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, publicKey }), // Enviar chave pública junto com credenciais
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

    // Escuta mensagens recebidas do servidor
    socket.on('message', (data) => {
        const decryptedMessage = decryptMessage(data.encryptedMessage, privateKey);
        console.log(`Mensagem recebida: ${decryptedMessage}`);
    });

    rl.question('Digite sua mensagem: ', (message) => {
        const encryptedMessage = encryptMessage(message, publicKey);
        socket.emit('message', { encryptedMessage });
        rl.close();
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
