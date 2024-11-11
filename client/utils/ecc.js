const elliptic = require('elliptic');
const crypto = require('crypto');

// Definir a curva ECC (NIST P-256)
const ec = new elliptic.ec('p256');

// Função para gerar chave privada
function generatePrivateKey() {
  const keyPair = ec.genKeyPair();
  return keyPair.getPrivate('hex');
}

// Função para gerar chave pública a partir da chave privada
function generatePublicKey(privateKey) {
  const keyPair = ec.keyFromPrivate(privateKey);
  return keyPair.getPublic('hex');
}

// Função para gerar chave ECDH (shared secret) usando a chave privada do usuário e a chave pública do outro usuário
function generateSharedSecret(privateKey, otherPublicKey) {
  const keyPair = ec.keyFromPrivate(privateKey);
  const sharedSecret = keyPair.derive(ec.keyFromPublic(otherPublicKey, 'hex').getPublic());
  return sharedSecret.toString('hex');
}

// Função para criptografar uma mensagem com AES
function encryptMessage(message, sharedSecret) {
  const key = crypto.createHash('sha256').update(sharedSecret).digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encryptedMessage = cipher.update(message, 'utf8', 'hex');
  encryptedMessage += cipher.final('hex');

  return { iv: iv.toString('hex'), encryptedMessage };
}

// Função para descriptografar a mensagem com AES
function decryptMessage(encryptedData, sharedSecret) {
  const key = crypto.createHash('sha256').update(sharedSecret).digest();
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const encryptedMessage = Buffer.from(encryptedData.encryptedMessage, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decryptedMessage = decipher.update(encryptedMessage, null, 'utf8');
  decryptedMessage += decipher.final('utf8');

  return decryptedMessage;
}

module.exports = { generatePrivateKey, generatePublicKey, generateSharedSecret, encryptMessage, decryptMessage };
