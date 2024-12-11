const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');  // Isso importa diretamente o modelo `User`
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuração do transporte de e-mail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'exemploemail@gmail.com', // Atualizar com seu e-mail
        pass: '' // Atualizar com sua senha ou usar variáveis de ambiente
    }
});

// Armazenamento temporário de códigos de autenticação
const tempCodes = new Map();

// Rota para cadastro de usuário
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password /*|| !publicKey*/) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
        return res.status(400).json({ error: 'Nome de usuário já está em uso.' });
    }

    try {
        // Criptografar a senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar o novo usuário no banco de dados
        const newUser = await User.create({
            username,
            password: hashedPassword,
            //public_key: publicKey,  // Armazenar chave pública
        });

        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
});

// Rota de autenticação
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Busca pelo usuário no banco de dados
        const user = await User.findOne({ where: { username } });

        // Verifica se o usuário existe
        if (!user) {
            return res.status(500).json({ message: 'Usuário ou senha incorretos' });
        }

        // Verifica se a senha é válida
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(500).json({ message: 'Usuário ou senha incorretos' });
        }

        // Gera um código de autenticação de 6 dígitos
        const authCode = crypto.randomInt(100000, 999999).toString();
        tempCodes.set(username, authCode);

        setTimeout(() => tempCodes.delete(username), 5 * 60 * 1000); // Expira em 5 minutos

        // Envia o código de autenticação por e-mail
        transporter.sendMail({
            from: 'exemploemail@gmail.com',
            to: username, // E-mail do usuário
            subject: 'Código de Autenticação',
            text: `Seu código de autenticação é: ${authCode}`
        }, (err, info) => {
            if (err) {
                console.error('Erro ao enviar e-mail:', err);
                return res.status(500).json({ message: 'Erro ao enviar o código de autenticação.' });
            }

            console.log('Código enviado:', info.response);
            res.status(200).json({
                message: 'Login bem-sucedido. Código de autenticação enviado por e-mail.',
                // publicKey: user.public_key // Envia a chave pública ao cliente, se necessário
            });
        });
    } catch (error) {
        console.error('Erro ao autenticar usuário:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para verificar o código de autenticação
router.post('/verify-code', async (req, res) => {
    try {
        const { inputUsername, code } = req.body;

        if (!inputUsername || !code) {
            return res.status(400).json({ message: 'Usuário e código são obrigatórios.' });
        }

        // Certifique-se de que o código seja comparado como string, sem espaços extras
        const storedCode = tempCodes.get(inputUsername)?.trim();
        const receivedCode = code.toString().trim();

        console.log("cód armazenado: " + storedCode);
        console.log("cód recebido: " + receivedCode);

        if (storedCode === receivedCode) {
            tempCodes.delete(inputUsername); // Remove o código armazenado após o uso
            return res.status(200).json({ message: 'Código validado com sucesso!' });
        }

        return res.status(400).json({ message: 'Código inválido ou expirado.' });
    } catch (error) {
        console.error('Erro ao verificar o código:', error);
        res.status(500).json({ message: 'Erro no servidor ao verificar o código.' });
    }
});

module.exports = router;
