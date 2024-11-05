const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const router = express.Router();

// Rota de registro
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO usuarios (nome_usuario, senha_hash) VALUES (?, ?)';
    db.query(sql, [username, hashedPassword], (err, result) => {
        if (err) return res.status(500).json({ error: 'Erro ao registrar usuário.' });
        res.status(201).json({ message: 'Usuário registrado com sucesso.' });
    });
});

// Rota de login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM usuarios WHERE nome_usuario = ?';
    db.query(sql, [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.senha_hash);
        if (!match) return res.status(401).json({ error: 'Credenciais inválidas.' });

        res.json({ message: 'Login bem-sucedido.' });
    });
});

module.exports = router;
