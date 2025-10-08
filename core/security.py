import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings, get_private_key, get_public_key

# Switch to Argon2, which is more secure and doesn't have bcrypt's length limit.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

settings = get_settings()


def generate_recovery_code(length: int = 64) -> str:
    """Generates a cryptographically strong random string."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for i in range(length))


def generate_contact_id(length: int = 16) -> str:
    """Generates a cryptographically strong random string for contact IDs."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for i in range(length))


def get_recovery_code_hash(code: str) -> str:
    """Hashes the recovery code using Argon2."""
    return pwd_context.hash(code)


def verify_recovery_code(plain_code: str, hashed_code: str) -> bool:
    """Verifies the recovery code against the hash."""
    return pwd_context.verify(plain_code, hashed_code)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    private_key = get_private_key()
    encoded_jwt = jwt.encode(to_encode, private_key, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str):
    try:
        public_key = get_public_key()
        payload = jwt.decode(token, public_key, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError:
        return None