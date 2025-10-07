import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings

# The conftest.py file handles the environment setup.
from app import app
from core.database import Base, get_db
from core.config import get_settings, Settings
from models.user import User

# --- Test-specific Configuration ---
# This overrides the application's default configuration for the tests.
# This approach is more robust as it doesn't depend on .env files being present.

class TestSettings(Settings):
    DATABASE_URL: str = "sqlite:///./test.db"
    ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    LOG_LEVEL: str = "DEBUG"
    IP_SALT: str = "test-salt"

def get_test_settings():
    return TestSettings()

# Apply the override
app.dependency_overrides[get_settings] = get_test_settings

# --- Test Database Setup ---
engine = create_engine(
    get_test_settings().DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_teardown_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()

@pytest.fixture(scope="module")
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    # Clear overrides after tests
    app.dependency_overrides.clear()


def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 200

def test_signup_and_login(client, db_session):
    # --- Signup ---
    signup_response = client.post(
        "/api/auth/signup",
        json={"username": "testuser", "public_key": "test_public_key"},
    )
    assert signup_response.status_code == 200
    signup_data = signup_response.json()
    assert signup_data["username"] == "testuser"
    assert "recovery_code" in signup_data
    recovery_code = signup_data["recovery_code"]

    # --- Login ---
    login_response = client.post(
        "/api/auth/token",
        json={"username": "testuser", "recovery_code": recovery_code},
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data

def test_login_invalid_code(client):
    # A user must exist to test against
    client.post("/api/auth/signup", json={"username": "anotheruser", "public_key": "key"})

    login_response = client.post(
        "/api/auth/token",
        json={"username": "anotheruser", "recovery_code": "invalid_code_that_is_exactly_64_characters_long_so_it_passes_len"},
    )
    assert login_response.status_code == 401
    assert "Incorrect username or recovery code" in login_response.text