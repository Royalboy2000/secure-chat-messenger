# Secure Messenger Application

This is a secure, end-to-end encrypted messenger application built with FastAPI and a modern frontend. The application prioritizes security, privacy, and compliance.

## Features

-   **End-to-End Encryption (E2EE):** Messages are encrypted on the client-side using RSA-OAEP, ensuring only the sender and recipient can read them.
-   **Secure Authentication:** Users are authenticated using a server-generated 64-character recovery code. The server only stores a hash of this code.
-   **JWT-based Sessions:** Secure session management using JSON Web Tokens signed with the RS256 algorithm.
-   **Privacy-Preserving Logging:** The server logs requests with hashed IP addresses to protect user privacy while maintaining security.
-   **Security Hardening:** Includes security headers (CSP, HSTS, etc.) to protect against common web vulnerabilities.
-   **Containerized Deployment:** Comes with a `Dockerfile` and `docker-compose.yml` for easy and consistent deployment.

## Setup and Local Development

### Prerequisites

-   Docker
-   Docker Compose

### Running the Application

1.  **Generate RSA Keys:**
    The application uses an RSA key pair for signing JWTs. You must generate these keys before running the application for the first time.

    ```bash
    # Create the directory to store the keys
    mkdir keys

    # Run the key generation script
    python3 core/generate_keys.py
    ```

    This will create `private_key.pem` and `public_key.pem` in the `keys/` directory. **These keys are sensitive and should not be committed to version control.** The `.gitignore` file is already configured to ignore them.

2.  **Set up Environment Variables:**
    Create a `.env` file in the project root. You can copy the example:

    ```bash
    cp .env.example .env
    ```

    Update the `IP_SALT` in the `.env` file with a unique, random string.

3.  **Build and Run with Docker Compose:**

    ```bash
    docker-compose up --build
    ```

    The application will be available at `http://localhost:8000`.

## Secrets Management

-   **RSA Keys:** The `private_key.pem` and `public_key.pem` files are critical secrets. In a production environment, these should be managed using a secure vault system like HashiCorp Vault, AWS Secrets Manager, or Google Secret Manager. They should be injected into the application environment at runtime, not stored on disk in the container.
-   **IP Salt:** The `IP_SALT` in the `.env` file should be a long, random, and unique string for each deployment. This salt is used for hashing user IP addresses in the logs.

## Running Tests

To run the automated tests, use `pytest`:

```bash
# Install testing dependencies if you haven't already
pip install pytest python-dotenv

# Run the tests
pytest
```