from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    public_key: str

class User(BaseModel):
    id: int
    username: str
    public_key: str

    class Config:
        orm_mode = True