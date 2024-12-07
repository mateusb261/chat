const readline = require('readline');
const io = require('socket.io-client');
const { SERVER_URL } = require('./config/config');
const { generatePrivateKey, generatePublicKey, generateSharedSecret, encryptMessage, decryptMessage } = require('./utils/ecc'); // Agora inclui encryptMessage e decryptMessage

let currentUserPrivateKey;
let currentUserPublicKey;
let sharedSecretUser;
let username; // Variável global para o nome de usuário

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

            console.log('Chave pública recebida:', publicKey); // Verifique se a chave pública está correta

            sharedSecretUser = generateSharedSecret(currentUserPrivateKey, publicKey);
            const decryptedMessage = decryptMessage(data.message, sharedSecretUser); // Descriptografa a mensagem recebida
            console.log(`Mensagem recebida de ${data.from}: ${decryptedMessage}`);

            // Exibe as opções de chat novamente após a mensagem ser recebida
            startChat(); // Agora a função não precisa mais passar username explicitamente
        });
    } catch (err) {
        console.error('Erro ao descriptografar a mensagem:', err);
    }
});

// Mensagem ao conectar com sucesso
socket.on('connect', () => {
    console.log('Conectado ao servidor WebSocket com ID do socket:', socket.id);
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
    // Se a conexão falhar, tenta reconectar automaticamente
    setTimeout(() => {
        console.log('Tentando reconectar...');
        socket.connect();
    }, 5000); // Tenta reconectar após 5 segundos
});

// Função para autenticação de usuário
const authenticateUser = async (inputUsername, password) => {
    username = inputUsername; // Atualiza a variável global username
    const response = await fetch(`${SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    currentUserPrivateKey = generatePrivateKey();
    currentUserPublicKey = generatePublicKey(currentUserPrivateKey);

    const data = await response.json();

    console.log('Chave privada do usuário logado gerada e armazenada no cliente:', currentUserPrivateKey);
    console.log('Chave pública do usuário logado gerada e armazenada no cliente:', currentUserPublicKey);

    return data;
};

// Função para cadastro de usuário (incluindo chave pública)
const registerUser = async (inputUsername, password) => {
    username = inputUsername; // Atualiza a variável global username

    console.log(`Cadastro de Usuário:`);
    console.log(`Nome de Usuário: ${username}`);

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

    startApp(); // Continua a execução do menu após o cadastro

    return responseData;
};

// Função para iniciar o chat e mostrar o menu de opções
const startChat = () => {
    console.log("Username antes de login:", username); // Verifique se username está correto.
    socket.emit('login', username, currentUserPublicKey); // Envia a chave pública junto com o login

    // Remove o ouvinte anterior, se houver, para evitar múltiplas mensagens duplicadas
    socket.off('activeUsers');

    socket.on('activeUsers', (otherUsers) => {

        if (otherUsers.length === 0) {
            console.log('Nenhum outro usuário está logado no servidor.');
            rl.question('1 - Tentar novamente escolher um usuário para chat\n2 - Fazer Logout\nEscolha: ', (choice) => {
                if (choice === '1') {
                    startChat(); // Tenta buscar usuários novamente
                } else if (choice === '2') {
                    console.log('Logout realizado.');
                    socket.emit('logout');
                    startApp(); // Retorna ao menu principal
                } else {
                    console.log('Opção inválida.');
                    startChat(); // Retenta a escolha se a entrada for inválida
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
                    console.log(`Você escolheu iniciar um chat com: ${selectedUser}`);
                    sendMessage(selectedUser);
                } else {
                    console.log('Nenhum usuário selecionado para o chat.');
                    startApp(); // Retorna ao menu principal
                }
            });
        }
    });
};

// Função para mostrar o menu de chat
const showChatOptions = (selectedUser) => {
    console.log(`\nOpções de chat com ${selectedUser}:`);
    rl.question('1 - Enviar uma mensagem\n2 - Escolher outro usuário\n3 - Fazer Logout\nEscolha: ', (choice) => {
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

// Função para enviar uma mensagem ao usuário selecionado
const sendMessage = (selectedUser) => {
    socket.emit('requestPublicKey', selectedUser, (publicKey) => {
        socket.emit('startChat', selectedUser, publicKey); // Inicia o canal de chat com a chave pública do outro usuário

        sharedSecretUser = generateSharedSecret(currentUserPrivateKey, publicKey);
        console.log('Chave ECDH gerada e armazenada no cliente:', sharedSecretUser);

        rl.question('Digite sua mensagem: ', (message) => {
            try {
                const encryptedMessage = encryptMessage(message, sharedSecretUser); // Criptografa a mensagem com a chave pública do destinatário

                console.log('Mensagem criptografada:', encryptedMessage);

                socket.emit('message', { to: selectedUser, message: encryptedMessage }); // Envia a mensagem criptografada
                console.log('Mensagem enviada!');
                showChatOptions(selectedUser); // Volta ao menu de opções após enviar
            } catch (err) {
                console.error('Erro ao processar a mensagem:', err);
            }
        });
    });
};

// Função para escolher entre cadastro ou login
const startApp = () => {
    rl.question('Escolha uma opção:\n1 - Cadastrar Usuário\n2 - Fazer Login\nEscolha: ', (choice) => {
        if (choice === '1') {
            rl.question('Digite seu nome de usuário: ', (inputUsername) => {
                rl.question('Digite sua senha: ', { hideEchoBack: true }, (password) => {
                    registerUser(inputUsername, password).then(response => {
                        if (response.error) {
                            console.error('Erro no cadastro:', response.error);
                        } else {
                            startChat(); // Inicia o chat após o cadastro
                        }
                    });
                });
            });
        } else if (choice === '2') {
            rl.question('Digite seu nome de usuário: ', (inputUsername) => {
                rl.question('Digite sua senha: ', { hideEchoBack: true }, (password) => {
                    authenticateUser(inputUsername, password).then(authResponse => {
                        if (authResponse.message !== 'Login bem-sucedido') {
                            console.error('Erro no login:', authResponse.message);
                            startApp(); // Permite nova tentativa de login
                        } else {
                            console.log('Login bem-sucedido!');
                            startChat(); // Inicia o chat após login bem-sucedido
                        }
                    });
                });
            });
        } else {
            console.log('Opção inválida.');
            startApp(); // Retorna ao menu se a opção for inválida
        }
    });
};
