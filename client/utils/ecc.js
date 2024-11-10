const { generateKeyPairSync, privateEncrypt, publicDecrypt } = require('crypto');

// Função para gerar um par de chaves ECC
const generateKeys = () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'secp256k1', // ou outro padrão ECC
    });
    return { publicKey: publicKey.export({ type: 'spki', format: 'pem' }), privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
};

// Função para criptografar mensagem
const encryptMessage = (message, publicKey) => {
    try {
        return privateEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        }, Buffer.from(message));
    } catch (err) {
        console.error('Erro ao criptografar a mensagem:', err);
        throw err;
    }
};


// Função para descriptografar mensagem
const decryptMessage = (encryptedMessage, privateKey) => {
    return publicDecrypt(privateKey, encryptedMessage).toString();
};

module.exports = { generateKeys, encryptMessage, decryptMessage };
