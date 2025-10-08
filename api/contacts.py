from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core import crud
from core.database import get_db
from models.user import User as UserModel
from schemas.user import User
from schemas.contact import ContactAdd
from typing import List
from .dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=List[User])
def get_user_contacts(
    current_user: UserModel = Depends(get_current_user),
):
    """
    Get the current user's contact list.
    """
    return current_user.contacts

@router.post("/add", response_model=User)
def add_new_contact(
    contact: ContactAdd,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Add a new user to the current user's contact list using their contact ID.
    """
    if contact.contact_id == current_user.contact_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add yourself as a contact.",
        )

    target_user = crud.add_contact(db, current_user=current_user, target_contact_id=contact.contact_id)

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with the provided contact ID not found.",
        )

    return target_user