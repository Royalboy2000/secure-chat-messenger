import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
import secrets

from core import crud
from core.database import get_db
from models.user import User as UserModel
from schemas.user import User, UserWithDetails
from schemas.settings import RecoveryCodeResponse
from .dependencies import get_current_user

router = APIRouter()

# Define allowed content types and max file size (e.g., 5MB)
ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

@router.post("/profile-picture", response_model=User)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Upload a new profile picture for the current user.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP are allowed.",
        )

    size = await file.read()
    if len(size) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the limit of {MAX_FILE_SIZE / 1024 / 1024}MB.",
        )
    await file.seek(0)

    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed.",
        )

    unique_filename = f"{secrets.token_hex(16)}{file_extension}"
    file_path = os.path.join("static/profile_pics", unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        file.file.close()

    web_path = f"/static/profile_pics/{unique_filename}"
    updated_user = crud.update_profile_picture_path(db, user=current_user, path=web_path)

    return updated_user

@router.post("/regenerate-code", response_model=RecoveryCodeResponse)
def regenerate_user_recovery_code(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Generates a new recovery code for the current user, invalidating the old one.
    """
    new_code = crud.regenerate_recovery_code(db, user=current_user)
    return RecoveryCodeResponse(recovery_code=new_code)