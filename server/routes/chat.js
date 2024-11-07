const express = require('express');
const db = require('../config/db');
const router = express.Router();

// Rota para recuperar chave pública do usuário
router.get('/publicKey/:username', (req, res) => {
    const { username } = req.params;

    const sql = 'SELECT chave_publica FROM usuarios WHERE nome_usuario = ?';
    db.query(sql, [username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.json({ publicKey: results[0].chave_publica });
    });
});

module.exports = router;
