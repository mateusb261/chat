const readline = require('readline');
const io = require('socket.io-client');
const { SERVER_URL } = require('./config/config');
const { generatePrivateKey, generatePublicKey, generateSharedSecret, encryptMessage, decryptMessage } = require('./utils/ecc');
const fs = require('fs');

let currentUserPrivateKey;
let currentUserPublicKey;
let sharedSecretUser;
let username; // Variável global para o nome de usuário
let privateKeyEncrypted;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Conecta imediatamente ao servidor de chat
const socket = io(SERVER_URL);

// Ouve as mensagens recebidas de outros usuários
socket.on('newMessage', (data) => {
    if (!data.message || !data.from) {
        console.error('Mensagem inválida recebida:', data);
        return;
    }

    console.log(data.message);

    try {
        socket.emit('requestPublicKey', data.from, (publicKey) => {
            if (!publicKey) {
                console.error('Chave pública não recebida ou inválida!');
                return;
            }

            console.log('Chave pública recebida:', publicKey);

            sharedSecretUser = generateSharedSecret(currentUserPrivateKey, publicKey);
            const decryptedMessage = decryptMessage(data.message, sharedSecretUser);

            console.log(`Mensagem recebida de ${data.from}: ${decryptedMessage}`);
            startChat();
        });
    } catch (err) {
        console.error('Erro ao descriptografar a mensagem:', err);
    }
});

// Mensagem ao conectar com sucesso
socket.on('connect', () => {
    console.log('Conectado ao servidor WebSocket com ID do socket:', socket.id);
    startApp();
});

// Mensagem ao desconectar do servidor
socket.on('disconnect', () => {
    console.log('Desconectado do servidor.');
});

// Mensagem ao falhar a conexão
socket.on('connect_error', (error) => {
    console.error('Falha ao conectar ao servidor:', error.message);
    setTimeout(() => {
        console.log('Tentando reconectar...');
        socket.connect();
    }, 5000);
});

// Função para autenticação de usuário
const authenticateUser = async (inputUsername, password) => {
    username = inputUsername;

    const response = await fetch(`${SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const privateKeyFile = `${username}_privateKey.txt`;

    try {
        const encryptedDataString = fs.readFileSync(privateKeyFile, 'utf8');
        const encryptedData = JSON.parse(encryptedDataString);
        currentUserPrivateKey = decryptMessage(encryptedData, password);
    } catch (err) {
        console.error(`Erro ao carregar a chave privada de ${username}:`, err.message);
    }

    currentUserPublicKey = generatePublicKey(currentUserPrivateKey);
    const data = await response.json();

    console.log('Chave privada:', currentUserPrivateKey);
    console.log('Chave pública:', currentUserPublicKey);

    return data;
};

// Função para autenticação com o código de verificação
function requestAuthCode(inputUsername) {
    rl.question("Digite o código de autenticação recebido: ", async (code) => {
        try {
            const response = await fetch(`${SERVER_URL}/auth/verify-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputUsername, code }),
            });

            if (response.ok) {
                console.log("Autenticação em duas etapas concluída com sucesso!");
                console.log("Bem-vindo à aplicação!");
                startChat();
            } else {
                const errorData = await response.json();
                console.error("Código inválido:", errorData.message || "Erro desconhecido.");
                console.log("Tente novamente ou volte ao menu principal.");
                // Retorne para o menu principal ou permita tentar o código novamente
                startApp();
            }
        } catch (error) {
            console.error("Erro ao validar o código:", error.message);
            console.log("Tente novamente ou volte ao menu principal.");
            startApp();
        }
    });
}

// Função para cadastro de usuário
const registerUser = async (inputUsername, password) => {
    username = inputUsername;

    const response = await fetch(`${SERVER_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const responseData = await response.json();
    if (responseData.error) {
        console.error('Erro no cadastro:', responseData.error);
    } else {
        console.log('Cadastro realizado com sucesso!');
    }

    const privateKey = generatePrivateKey();
    const privateKeyFile = `${username}_privateKey.txt`;
    const encryptedData = encryptMessage(privateKey, password);
    const encryptedDataString = JSON.stringify(encryptedData);

    fs.writeFileSync(privateKeyFile, encryptedDataString, 'utf8');
    startApp();

    return responseData;
};

// Função para iniciar o chat
const startChat = () => {
    socket.emit('login', username, currentUserPublicKey);
    socket.off('activeUsers');

    socket.on('activeUsers', (otherUsers) => {
        if (otherUsers.length === 0) {
            console.log('Nenhum outro usuário está logado no servidor.');
            rl.question('1 - Tentar novamente\n2 - Fazer Logout\nEscolha: ', (choice) => {
                if (choice === '1') {
                    startChat();
                } else if (choice === '2') {
                    console.log('Logout realizado.');
                    socket.emit('logout');
                    startApp();
                } else {
                    console.log('Opção inválida.');
                    startChat();
                }
            });
        } else {
            console.log('\nOutros usuários conectados:');
            otherUsers.forEach((user, index) => {
                console.log(`${index + 1} - ${user}`);
            });

            rl.question('Escolha um usuário para iniciar um chat ou pressione Enter para ignorar: ', (choice) => {
                const selectedUser = otherUsers[parseInt(choice) - 1];
                if (selectedUser) {
                    sendMessage(selectedUser);
                } else {
                    console.log('Nenhum usuário selecionado.');
                    startApp();
                }
            });
        }
    });
};

// Função para enviar uma mensagem
const sendMessage = (selectedUser) => {
    socket.emit('requestPublicKey', selectedUser, (publicKey) => {
        socket.emit('startChat', selectedUser, publicKey);

        sharedSecretUser = generateSharedSecret(currentUserPrivateKey, publicKey);

        rl.question('Digite sua mensagem: ', (message) => {
            try {
                const encryptedMessage = encryptMessage(message, sharedSecretUser);
                socket.emit('message', { to: selectedUser, message: encryptedMessage });
                console.log('Mensagem enviada!');
                showChatOptions(selectedUser);
            } catch (err) {
                console.error('Erro ao processar a mensagem:', err);
            }
        });
    });
};

// Função para mostrar o menu de chat
const showChatOptions = (selectedUser) => {
    rl.question('1 - Enviar mensagem\n2 - Escolher outro usuário\n3 - Fazer Logout\nEscolha: ', (choice) => {
        if (choice === '1') {
            sendMessage(selectedUser);
        } else if (choice === '2') {
            startChat();
        } else if (choice === '3') {
            console.log('Fazendo logout...');
            socket.emit('logout');
            rl.close();
        } else {
            console.log('Opção inválida.');
            showChatOptions(selectedUser);
        }
    });
};

// Função principal
const startApp = () => {
    rl.question('1 - Cadastrar Usuário\n2 - Fazer Login\nEscolha: ', (choice) => {
        if (choice === '1') {
            rl.question('Digite seu nome de usuário: ', (inputUsername) => {
                rl.question('Digite sua senha: ', (password) => {
                    registerUser(inputUsername, password).then(() => startChat());
                });
            });
        } else if (choice === '2') {
            rl.question('Digite seu nome de usuário: ', (inputUsername) => {
                rl.question('Digite sua senha: ', (password) => {
                    authenticateUser(inputUsername, password).then(authResponse => {
                        if (authResponse.message !== 'Login bem-sucedido. Código de autenticação enviado por e-mail.') {
                            console.error('Erro no login:', authResponse.message);
                            startApp();
                        } else {
                            requestAuthCode(inputUsername);
                        }
                    });
                });
            });
        } else {
            console.log('Opção inválida.');
            startApp();
        }
    });
};
