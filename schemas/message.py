from pydantic import BaseModel

class MessageBase(BaseModel):
    recipient_username: str
    encrypted_content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    sender_id: int

    class Config:
        orm_mode = True