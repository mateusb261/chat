const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');  // Isso importa diretamente o modelo `User`
const router = express.Router();

// Rota para cadastro de usuário
router.post('/register', async (req, res) => {
    const { username, password, publicKey } = req.body;

    if (!username || !password || !publicKey) {
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
            public_key: publicKey,  // Armazenar chave pública
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
        //return res.status(500).json({ message: 'Usuário não encontrado' });
        return res.status(500).json({ message: 'Usuário ou senha incorretos' });
    }

    // Verifica se a senha é válida
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Verifica se a senha é válida
    if (!isPasswordValid) {
        //return res.status(401).json({ message: 'Senha incorreta' });
        return res.status(500).json({ message: 'Usuário ou senha incorretos' });
    }

    // Se tudo estiver certo, retorna sucesso no login
    res.status(200).json({ message: 'Login bem-sucedido' });

  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;
