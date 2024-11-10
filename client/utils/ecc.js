const { generateKeyPairSync, privateEncrypt, publicDecrypt } = require('crypto');
const crypto = require('crypto');

// Função para gerar um par de chaves ECC
const generateKeys = () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
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
        const sign = crypto.createSign('SHA256');
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
        const verify = crypto.createVerify('SHA256');
        verify.update(message);
        const isValid = verify.verify(publicKey, signature, 'base64');
        return isValid; // Retorna verdadeiro se a assinatura for válida
    } catch (err) {
        console.error('Erro ao verificar a assinatura:', err);
        throw err;
    }
};

module.exports = { generateKeys, signMessage, verifyMessage };
