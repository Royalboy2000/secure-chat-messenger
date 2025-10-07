from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    recovery_code: str

class SignupResponse(BaseModel):
    id: int
    username: str
    public_key: str
    recovery_code: str

    class Config:
        orm_mode = True