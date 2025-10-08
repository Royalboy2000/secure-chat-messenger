from pydantic import BaseModel

class RecoveryCodeResponse(BaseModel):
    recovery_code: str