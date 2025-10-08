from pydantic import BaseModel

class ContactAdd(BaseModel):
    contact_id: str