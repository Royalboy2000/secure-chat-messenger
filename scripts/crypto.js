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

// --- Symmetric Encryption for Private Key Storage ---

/**
 * Derives a key from a password/code using PBKDF2.
 * @param {string} code The user's recovery code.
 * @param {Uint8Array} salt A random salt.
 * @returns {Promise<CryptoKey>} A promise that resolves to a CryptoKey for AES-GCM.
 */
async function deriveKeyFromCode(code, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(code),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts the private key JWK with a key derived from the recovery code.
 * @param {object} jwk The private key in JWK format.
 * @param {string} code The recovery code.
 * @returns {Promise<string>} A promise that resolves to a base64-encoded string containing salt, iv, and ciphertext.
 */
async function encryptPrivateKey(jwk, code) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeyFromCode(code, salt);
    const encoder = new TextEncoder();
    const dataToEncrypt = encoder.encode(JSON.stringify(jwk));

    const encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        dataToEncrypt
    );

    // Combine salt, iv, and ciphertext into one buffer
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Return as a base64 string for easy storage
    return window.btoa(String.fromCharCode.apply(null, combined));
}

/**
 * Decrypts an encrypted private key using the recovery code.
 * @param {string} encryptedKeyB64 The base64-encoded encrypted key data.
 * @param {string} code The recovery code.
 * @returns {Promise<object>} A promise that resolves to the private key in JWK format.
 */
async function decryptPrivateKey(encryptedKeyB64, code) {
    const combined = new Uint8Array(atob(encryptedKeyB64).split('').map(c => c.charCodeAt(0)));

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const key = await deriveKeyFromCode(code, salt);

    const decryptedData = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );

    const decoder = new TextDecoder();
    const jwkString = decoder.decode(decryptedData);
    return JSON.parse(jwkString);
}