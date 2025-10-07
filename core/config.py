import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # pytest-dotenv will load the .env file into the environment.
    # pydantic-settings will automatically read from the environment.
    model_config = SettingsConfigDict(extra='ignore')

    app_name: str = "Secure Messenger"
    DATABASE_URL: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Paths to the RSA keys
    private_key_path: str = "keys/private_key.pem"
    public_key_path: str = "keys/public_key.pem"

    # Logging settings
    LOG_LEVEL: str = "INFO"
    IP_SALT: str = "default-salt-please-change"

@lru_cache()
def get_settings():
    return Settings()

def get_private_key() -> str:
    settings = get_settings()
    project_root = Path(__file__).resolve().parent.parent
    private_key_path = project_root / settings.private_key_path
    with open(private_key_path, "r") as f:
        return f.read()

def get_public_key() -> str:
    settings = get_settings()
    project_root = Path(__file__).resolve().parent.parent
    public_key_path = project_root / settings.public_key_path
    with open(public_key_path, "r") as f:
        return f.read()