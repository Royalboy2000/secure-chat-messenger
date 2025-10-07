# Implementation Notes

This document outlines the key design and security choices made in this application.

## Cryptographic Choices

-   **JWT Signing Algorithm:** `RS256` (RSA Signature with SHA-256) was chosen for JWT signing. Asymmetric cryptography is used so that the server can sign tokens with a private key, while services that need to verify the token only need access to the public key. This limits the exposure of the signing key.

-   **End-to-End Encryption:** `RSA-OAEP` with a 2048-bit key and SHA-256 is used for client-side encryption of messages. The Web Crypto API is used in the browser to perform these operations. Each user has a unique RSA key pair, and their public key is shared with other users to encrypt messages intended for them.

-   **Password/Code Hashing:** `bcrypt` is used for hashing user recovery codes. It is a strong, adaptive hashing algorithm specifically designed for passwords and is the industry standard.

## Authentication and Session Management

-   **Authentication:** The application uses a server-generated, 64-character recovery code for authentication. This avoids the need for users to create and remember passwords and places the responsibility on them to store the high-entropy recovery code securely.
-   **JWT Tokens:** Upon successful login, the server issues a short-lived JWT access token. The token contains the username in the `sub` (subject) claim.
-   **Token Lifetime:** The access token has a lifetime of 30 minutes, which is a reasonable balance between security and user convenience. In a full production system, a refresh token mechanism would be implemented to allow for longer sessions without requiring the user to re-enter their recovery code.

## Privacy-Preserving Logging

-   **IP Address Hashing:** To protect user privacy, the server does not log raw IP addresses. Instead, it logs a `SHA-256` hash of the IP address, salted with a unique, per-deployment salt (`IP_SALT`). This allows for tracking requests from a single IP address for security monitoring without exposing the user's actual IP.
-   **Configurable Logging:** The logging level is configurable via the `LOG_LEVEL` environment variable. The default is `INFO`.
-   **No Sensitive Data in Logs:** The logging is configured to avoid logging any personally identifiable information (PII) or sensitive data beyond the hashed IP and the request path.

## Security Hardening

-   **Security Headers:** The application uses middleware to set important security headers:
    -   `Content-Security-Policy (CSP)`: Restricts the sources of content to prevent XSS attacks.
    -   `Strict-Transport-Security (HSTS)`: Enforces the use of HTTPS.
    -   `X-Content-Type-Options`: Prevents MIME-sniffing attacks.
    -   `X-Frame-Options`: Prevents clickjacking attacks.
-   **Input Validation:** Pydantic is used for rigorous input validation on all API endpoints, ensuring that data conforms to the expected schemas.

## Limitations and Trade-offs

-   **No Refresh Tokens:** This implementation does not include refresh tokens. As a result, users will need to log in again with their recovery code every 30 minutes.
-   **No Key Revocation:** There is no mechanism for revoking compromised JWTs or user E2EE keys. In a production system, a token denylist or a more advanced revocation system would be necessary.
-   **Simplified Frontend Storage:** The frontend stores the user's private key and recovery code in `localStorage`. In a more secure application, the private key would ideally be non-exportable and stored in `IndexedDB`, and the user might be required to enter their recovery code to unlock it for each session.