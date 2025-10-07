from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def generate_keys():
    """
    Generates a new RSA private and public key pair and saves them to the 'keys' directory.
    """
    # Generate a new private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    # Serialize the private key in PEM format
    pem_private_key = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    # Get the corresponding public key
    public_key = private_key.public_key()

    # Serialize the public key in PEM format
    pem_public_key = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    # Save the keys to files
    with open("keys/private_key.pem", "wb") as f:
        f.write(pem_private_key)

    with open("keys/public_key.pem", "wb") as f:
        f.write(pem_public_key)

    print("Successfully generated and saved 'private_key.pem' and 'public_key.pem' in the 'keys/' directory.")

if __name__ == "__main__":
    generate_keys()