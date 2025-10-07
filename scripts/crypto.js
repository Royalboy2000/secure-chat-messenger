/**
 * Generates an RSA-OAEP key pair for encryption/decryption.
 * @returns {Promise<CryptoKeyPair>} A promise that resolves to a CryptoKeyPair object.
 */
async function generateUserKeys() {
    return window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true, // can be extracted
        ["encrypt", "decrypt"]
    );
}

/**
 * Exports a CryptoKey to PEM format (for the public key).
 * @param {CryptoKey} key The public CryptoKey to export.
 * @returns {Promise<string>} A promise that resolves to the PEM-formatted key.
 */
async function exportPublicKeyPem(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
    const exportedAsBase64 = window.btoa(exportedAsString);
    return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
}

/**
 * Exports a CryptoKey to JWK format (for the private key).
 * @param {CryptoKey} key The private CryptoKey to export.
 * @returns {Promise<object>} A promise that resolves to the JWK object.
 */
async function exportPrivateKeyJwk(key) {
    return window.crypto.subtle.exportKey("jwk", key);
}

/**
 * Imports a private key from JWK format.
 * @param {object} jwk The JWK object representing the private key.
 * @returns {Promise<CryptoKey>} A promise that resolves to the imported CryptoKey.
 */
async function importPrivateKeyJwk(jwk) {
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["decrypt"]
    );
}

/**
 * Imports a public key from PEM format.
 * @param {string} pem The PEM-formatted public key.
 * @returns {Promise<CryptoKey>} A promise that resolves to the imported CryptoKey.
 */
async function importPublicKeyPem(pem) {
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length).trim();
    const binaryDer = window.atob(pemContents);
    const binaryDerArr = new Uint8Array(binaryDer.length);
    for (let i = 0; i < binaryDer.length; i++) {
        binaryDerArr[i] = binaryDer.charCodeAt(i);
    }
    return window.crypto.subtle.importKey(
        "spki",
        binaryDerArr.buffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}

/**
 * Encrypts a message with a public key.
 * @param {CryptoKey} publicKey The public key to encrypt with.
 * @param {string} plaintext The message to encrypt.
 * @returns {Promise<string>} A promise that resolves to the base64-encoded ciphertext.
 */
async function encryptMessage(publicKey, plaintext) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        data
    );
    const encryptedAsBase64 = window.btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)));
    return encryptedAsBase64;
}

/**
 * Decrypts a message with a private key.
 * @param {CryptoKey} privateKey The private key to decrypt with.
 * @param {string} ciphertextB64 The base64-encoded ciphertext.
 * @returns {Promise<string>} A promise that resolves to the decrypted plaintext.
 */
async function decryptMessage(privateKey, ciphertextB64) {
    const binaryDer = window.atob(ciphertextB64);
    const ciphertext = new Uint8Array(binaryDer.length);
    for (let i = 0; i < binaryDer.length; i++) {
        ciphertext[i] = binaryDer.charCodeAt(i);
    }
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}