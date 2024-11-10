const readline = require('readline');
const io = require('socket.io-client');
const { SERVER_URL } = require('./config/config');
const { generateKeys, encryptMessage, decryptMessage } = require('./utils/ecc');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Conecta imediatamente ao servidor de chat
const socket = io(SERVER_URL);

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
    const { publicKey, privateKey } = generateKeys();

    // Imprimir nome de usuário, senha e chave pública no terminal
    console.log(`Cadastro de Usuário:`);
    console.log(`Nome de Usuário: ${username}`);
    console.log(`Senha: ${password}`);
    console.log(`Chave Pública: ${publicKey}`);

    const response = await fetch(`${SERVER_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, publicKey }),
    });

    const responseData = await response.json(); // Mantém a resposta JSON

    if (responseData.error) {
        console.error('Erro no cadastro:', responseData.error);
    } else {
        console.log('Cadastro realizado com sucesso!');
    }

    // Não fecha o readline aqui para manter o terminal ativo para nova entrada
    // Chama a função para mostrar o menu novamente após o cadastro
    startApp(); // Continua a execução do menu após o cadastro

    return responseData; // Retorna a resposta JSON
};

// Função para iniciar o chat e mostrar o menu de opções
const startChat = (username) => {
    socket.emit('login', username);

    // Remove o ouvinte anterior, se houver, para evitar múltiplas mensagens duplicadas
    socket.off('activeUsers');

    socket.on('activeUsers', (otherUsers) => {
        console.log('\nOutros usuários conectados:');
        otherUsers.forEach((user, index) => {
            console.log(`${index + 1} - ${user}`);
        });

        rl.question('Escolha um usuário para iniciar um chat ou pressione Enter para ignorar: ', (choice) => {
            const selectedUser = otherUsers[parseInt(choice) - 1];
            if (selectedUser) {
                console.log(`Você escolheu iniciar um chat com: ${selectedUser}`);
                startChatSession(username, selectedUser);
            } else {
                //console.log('Nenhum usuário selecionado para o chat.');
                //startApp();

                console.log('Logout realizado.');
                socket.emit('logout');
                //rl.close();

                startApp(); // Retorna ao menu principal
            }
        });
    });
};

// Função para iniciar uma sessão de chat
const startChatSession = (username, selectedUser) => {
    socket.emit('requestPublicKey', selectedUser, (publicKey) => {
        if (!publicKey) {
            console.error('Chave pública não recebida ou inválida!');
            return;
        }

        console.log('Chave pública recebida:', publicKey); // Verifique se a chave pública está correta

        // Agora você pode continuar com a inicialização do chat e criptografia da mensagem
        const { privateKey } = generateKeys();
        socket.emit('startChat', selectedUser, publicKey); // Inicia o canal de chat com a chave pública do outro usuário

        rl.question('Digite sua mensagem: ', (message) => {
            try {
                const encryptedMessage = encryptMessage(message, publicKey); // Criptografa com a chave pública
                socket.emit('message', { to: selectedUser, encryptedMessage });
                console.log('Mensagem enviada!');
                showChatOptions(username, selectedUser);
            } catch (err) {
                console.error('Erro ao criptografar a mensagem:', err);
            }
        });
    });
};

// Função para mostrar o menu de chat
const showChatOptions = (username, selectedUser) => {
    console.log(`\nOpções de chat com ${selectedUser}:`);
    rl.question('1 - Enviar uma mensagem\n2 - Escolher outro usuário\n3 - Fazer Logout\nEscolha: ', (choice) => {
        if (choice === '1') {
            sendMessage(username, selectedUser);
        } else if (choice === '2') {
            startChat(username);
        } else if (choice === '3') {
            console.log('Fazendo logout...');
            socket.emit('logout');
            rl.close();
        } else {
            console.log('Opção inválida.');
            showChatOptions(username, selectedUser);
        }
    });
};

// Função para enviar uma mensagem ao usuário selecionado
const sendMessage = (username, selectedUser) => {
    socket.emit('requestPublicKey', selectedUser, (publicKey) => {
        const { privateKey } = generateKeys();
        rl.question('Digite sua mensagem: ', (message) => {
            const encryptedMessage = encryptMessage(message, publicKey);
            socket.emit('message', { to: selectedUser, encryptedMessage });
            console.log('Mensagem enviada!');
            showChatOptions(username, selectedUser); // Volta ao menu de opções após enviar
        });
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
                            // O fluxo agora continua corretamente após o cadastro
                            // Não é necessário mais chamar startApp() aqui
                            startChat(username);
                        }
                    });
                });
            });
        } else if (choice === '2') {
            rl.question('Digite seu nome de usuário: ', (username) => {
                rl.question('Digite sua senha: ', (password) => {
                    authenticateUser(username, password).then(authResponse => {
                        if (authResponse.message !== 'Login bem-sucedido') {
                            console.error('Erro no login:', authResponse.message /*|| 'Usuário ou senha incorretos'*/);
                            //console.log('Usuário ou senha incorretos');
                            // Chama startApp novamente para permitir nova tentativa de login ou cadastro
                            startApp();
                        } else {
                            console.log('Login bem-sucedido!');
                            startChat(username);
                        }
                    });
                });
            });
        } else {
            console.log('Opção inválida.');
            rl.close(); // Encerra o programa em caso de escolha inválida
        }
    });
};
