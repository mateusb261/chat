const express = require('express');
const db = require('../config/db');
const router = express.Router();
const User = require('../models/User');  // Isso importa diretamente o modelo `User`

router.get('/publicKey/:username', async (req, res) => {
    const { username } = req.params;

    console.log("Username recebido:", username); // Debug

    try {
        // Buscando o usuário pelo username
        const user = await User.findOne({
            where: { username: username },
            attributes: ['public_key'], // Apenas o campo public_key
        });

        if (!user) {
            console.log("Usuário não encontrado:", username);  // Log se o usuário não foi encontrado
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        console.log("Usuário encontrado:", username);  // Log se o usuário foi encontrado
        res.json({ publicKey: user.public_key });
    } catch (err) {
        console.error('Erro no servidor:', err);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;
