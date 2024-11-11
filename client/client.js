const readline = require('readline');
const io = require('socket.io-client');
const { SERVER_URL } = require('./config/config');
const { generatePrivateKey, generatePublicKey, generateSharedSecret, encryptMessage, decryptMessage } = require('./utils/ecc'); // Agora inclui encryptMessage e decryptMessage

let currentUserPrivateKey;
let currentUserPublicKey;
let sharedSecretUser;

let selectedUser;

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
const authenticateUser = async (username, password) => {
    const response = await fetch(`${SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    currentUserPrivateKey = generatePrivateKey();
    currentUserPublicKey = generatePublicKey(currentUserPrivateKey);

    const data = await response.json();

    // Armazena a chave pública do usuário logado para uso posterior
    if (data.publicKey/* && data.privateKey*/) {
        console.log('Chave pública do usuário logado armazenada:', currentUserPublicKey);
        console.log('Chave privada gerada e armazenada no cliente:', currentUserPrivateKey); // Para debug
        console.log('Chave privada gerada e armazenada no cliente:', sharedSecretUser); // Para debug
    } else {
        console.error('Falha ao obter a chave pública ou privada do usuário logado.');
    }

    return data;
};

// Função para cadastro de usuário (incluindo chave pública)
const registerUser = async (username, password) => {
    //const { publicKey, privateKey } = generateKeys();

    // Imprimir nome de usuário, senha e chave pública no terminal
    console.log(`Cadastro de Usuário:`);
    console.log(`Nome de Usuário: ${username}`);
    //console.log(`Senha: ${password}`);
    //console.log(`Chave Pública: ${publicKey}`);

    const response = await fetch(`${SERVER_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
    socket.emit('login', username, currentUserPublicKey); // Envia a chave pública junto com o login

    // Remove o ouvinte anterior, se houver, para evitar múltiplas mensagens duplicadas
    socket.off('activeUsers');

    socket.on('activeUsers', (otherUsers) => {
        console.log('\nOutros usuários conectados:');
        otherUsers.forEach((user, index) => {
            console.log(`${index + 1} - ${user}`);
        });

        rl.question('Escolha um usuário para iniciar um chat ou pressione Enter para ignorar: ', (choice) => {
            const selectedUser = otherUsers[parseInt(choice) - 1];
            //console.log(selectedUser);
            if (selectedUser) {
                console.log(`Você escolheu iniciar um chat com: ${selectedUser}`);
                sendMessage(username, selectedUser);
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
    console.log(`Usuário esolhido dentro de startChatSession: ${selectedUser}`);
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
                const signature = signMessage(message, currentUserPrivateKey); // Assina a mensagem com a chave privada
                socket.emit('message', { to: selectedUser, message, signature }); // Envia mensagem assinada
                console.log('Mensagem enviada!');
                showChatOptions(username, selectedUser);
            } catch (err) {
                console.error('Erro ao assinar a mensagem:', err);
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
        socket.emit('startChat', selectedUser, publicKey); // Inicia o canal de chat com a chave pública do outro usuário

        console.log(publicKey);

        sharedSecretUser = generateSharedSecret(currentUserPrivateKey, publicKey);

        rl.question('Digite sua mensagem: ', (message) => {
            try {
                const encryptedMessage = encryptMessage(message, sharedSecretUser); // Criptografa a mensagem com a chave pública do destinatário

                // Exibe a mensagem criptografada para verificação
                console.log('Mensagem criptografada:', encryptedMessage);

                socket.emit('message', { to: selectedUser, message: encryptedMessage }); // Envia a mensagem criptografada e assinada
                console.log('Mensagem enviada!');
                showChatOptions(username, selectedUser); // Volta ao menu de opções após enviar
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
            rl.question('Digite seu nome de usuário: ', (username) => {
                rl.question('Digite sua senha: ', { hideEchoBack: true }, (password) => {
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
                rl.question('Digite sua senha: ', { hideEchoBack: true }, (password) => {
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
