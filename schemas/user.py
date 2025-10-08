from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    public_key: str

class User(BaseModel):
    id: int
    username: str
    public_key: str
    profile_picture_path: Optional[str] = None

    class Config:
        orm_mode = True

class UserWithDetails(User):
    contact_id: str