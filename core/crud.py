from sqlalchemy.orm import Session

from models.user import User
from models.message import Message
from schemas.user import UserCreate
from .security import generate_recovery_code, get_recovery_code_hash


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, user: UserCreate):
    recovery_code = generate_recovery_code()
    hashed_code = get_recovery_code_hash(recovery_code)

    db_user = User(
        username=user.username,
        password_hash=hashed_code, # Storing the hashed code in the password field
        public_key=user.public_key,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Return the user object and the plain recovery code for the response
    return db_user, recovery_code


def create_message(db: Session, sender_id: int, recipient_id: int, encrypted_content: str):
    db_message = Message(
        sender_id=sender_id,
        recipient_id=recipient_id,
        encrypted_content=encrypted_content,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_messages_for_user(db: Session, user_id: int):
    return db.query(Message).filter(Message.recipient_id == user_id).all()