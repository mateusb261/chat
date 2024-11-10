const { generateKeyPairSync, publicEncrypt, privateDecrypt, createSign, createVerify } = require('crypto');

// Função para gerar um par de chaves ECC
const generateKeys = () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'secp256k1', // ou outro padrão ECC
    });
    return {
        publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' })
    };
};

// Função para assinar a mensagem com a chave privada (ECC)
const signMessage = (message, privateKey) => {
    try {
        const sign = createSign('SHA256');
        sign.update(message);
        const signature = sign.sign(privateKey, 'base64');
        return signature; // Retorna a assinatura da mensagem
    } catch (err) {
        console.error('Erro ao assinar a mensagem:', err);
        throw err;
    }
};

// Função para verificar a assinatura da mensagem com a chave pública (ECC)
const verifyMessage = (message, signature, publicKey) => {
    try {
        const verify = createVerify('SHA256');
        verify.update(message);
        const isValid = verify.verify(publicKey, signature, 'base64');
        return isValid; // Retorna verdadeiro se a assinatura for válida
    } catch (err) {
        console.error('Erro ao verificar a assinatura:', err);
        throw err;
    }
};

// Função para criptografar a mensagem com a chave pública do destinatário
const encryptMessage = (message, publicKey) => {
    try {
        const encrypted = publicEncrypt(publicKey, Buffer.from(message));
        return encrypted.toString('base64'); // Retorna a mensagem criptografada
    } catch (err) {
        console.error('Erro ao criptografar a mensagem:', err);
        throw err;
    }
};

// Função para descriptografar a mensagem com a chave privada do destinatário
const decryptMessage = (encryptedMessage, privateKey) => {
    try {
        const decrypted = privateDecrypt(privateKey, Buffer.from(encryptedMessage, 'base64'));
        return decrypted.toString(); // Retorna a mensagem descriptografada
    } catch (err) {
        console.error('Erro ao descriptografar a mensagem:', err);
        throw err;
    }
};

module.exports = { generateKeys, signMessage, verifyMessage, encryptMessage, decryptMessage };
