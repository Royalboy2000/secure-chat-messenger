from sqlalchemy.orm import Session

from models.user import User
from models.message import Message
from schemas.user import UserCreate
from .security import generate_recovery_code, get_recovery_code_hash, generate_contact_id


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_contact_id(db: Session, contact_id: str):
    return db.query(User).filter(User.contact_id == contact_id).first()


def create_user(db: Session, user: UserCreate):
    recovery_code = generate_recovery_code()
    hashed_code = get_recovery_code_hash(recovery_code)

    # Generate a unique contact ID
    while True:
        contact_id = generate_contact_id()
        if not get_user_by_contact_id(db, contact_id):
            break

    db_user = User(
        username=user.username,
        password_hash=hashed_code, # Storing the hashed code in the password field
        public_key=user.public_key,
        contact_id=contact_id,
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

def add_contact(db: Session, current_user: User, target_contact_id: str) -> User:
    """Adds a user to the current user's contact list."""
    target_user = get_user_by_contact_id(db, target_contact_id)
    if not target_user:
        return None

    # Avoid adding self or duplicates
    if target_user.id == current_user.id or target_user in current_user.contacts:
        return target_user

    current_user.contacts.append(target_user)
    db.commit()
    return target_user

def update_profile_picture_path(db: Session, user: User, path: str) -> User:
    """Updates the profile picture path for a user."""
    user.profile_picture_path = path
    db.commit()
    db.refresh(user)
    return user

def regenerate_recovery_code(db: Session, user: User) -> str:
    """Generates a new recovery code for a user and updates the database."""
    new_recovery_code = generate_recovery_code()
    new_hashed_code = get_recovery_code_hash(new_recovery_code)

    user.password_hash = new_hashed_code
    db.commit()

    return new_recovery_code