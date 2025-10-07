from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import schemas.user
from core import crud
from core.database import get_db
from core.security import create_access_token, verify_recovery_code
from schemas.token import Token
from schemas.auth import LoginRequest, SignupResponse


router = APIRouter()


@router.post("/signup", response_model=SignupResponse)
def signup(user: schemas.user.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    created_user, recovery_code = crud.create_user(db=db, user=user)

    return SignupResponse(
        id=created_user.id,
        username=created_user.username,
        public_key=created_user.public_key,
        recovery_code=recovery_code, # Send the one-time code to the user
    )


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: LoginRequest, db: Session = Depends(get_db)
):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_recovery_code(form_data.recovery_code, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or recovery code",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}