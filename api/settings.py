import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
import secrets
import magic

from core import crud
from core.database import get_db
from models.user import User as UserModel
from schemas.user import User
from schemas.settings import RecoveryCodeResponse
from .dependencies import get_current_user

router = APIRouter()

# Define allowed MIME types and max file size (e.g., 5MB)
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

@router.post("/profile-picture", response_model=User)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Upload a new profile picture for the current user with robust validation.
    """
    # 1. Security Validation: Check file size first
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the limit of {MAX_FILE_SIZE / 1024 / 1024}MB.",
        )

    # 2. Validate actual file content with python-magic
    mime_type = magic.from_buffer(contents, mime=True)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Detected: {mime_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    # 3. Generate a secure, unique filename with a trusted extension
    # Mapping MIME types to safe extensions
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    file_extension = ext_map.get(mime_type)

    unique_filename = f"{secrets.token_hex(16)}{file_extension}"
    file_path = os.path.join("static/profile_pics", unique_filename)

    # 4. Save the file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except IOError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save file.")

    # 5. Update the user's profile picture path in the database
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