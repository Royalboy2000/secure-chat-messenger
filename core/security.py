import secrets
import string
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings, get_private_key, get_public_key

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

settings = get_settings()


def generate_recovery_code(length: int = 64) -> str:
    """Generates a cryptographically strong random string."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for i in range(length))


def get_recovery_code_hash(code: str) -> str:
    """
    Hashes the recovery code.
    It first hashes the code with SHA-256 to bypass bcrypt's 72-byte limit
    in a secure manner.
    """
    hashed_once = hashlib.sha256(code.encode('utf-8')).hexdigest()
    return pwd_context.hash(hashed_once)


def verify_recovery_code(plain_code: str, hashed_code: str) -> bool:
    """
    Verifies the recovery code against the hash by performing the same
    pre-hashing step.
    """
    hashed_once = hashlib.sha256(plain_code.encode('utf-8')).hexdigest()
    return pwd_context.verify(hashed_once, hashed_code)


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