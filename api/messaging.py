from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core import crud
from core.database import get_db
from models.user import User as UserModel
from schemas.message import Message, MessageCreate
from schemas.user import User
from .dependencies import get_current_user

router = APIRouter()


@router.get("/users", response_model=List[User])
def get_users(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    return db.query(UserModel).all()


@router.get("/users/{username}/key", response_model=str)
def get_user_public_key(username: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.public_key


@router.post("/messages", response_model=Message)
def send_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    recipient = crud.get_user_by_username(db, username=message.recipient_username)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    return crud.create_message(
        db=db,
        sender_id=current_user.id,
        recipient_id=recipient.id,
        encrypted_content=message.encrypted_content,
    )


@router.get("/messages", response_model=List[Message])
def get_messages(
    db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)
):
    return crud.get_messages_for_user(db=db, user_id=current_user.id)