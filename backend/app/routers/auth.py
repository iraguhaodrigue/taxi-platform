import random
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas import UserCreate, UserOut, Token, VerifyEmailRequest, ResendCodeRequest, ProfileUpdate
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.core.email import send_email

router = APIRouter(prefix="/auth", tags=["auth"])

CODE_TTL_MINUTES = 15


def _validate_password(pw: str) -> None:
    if len(pw) < 8 or not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters and include both a letter and a number.",
        )


def _new_code() -> tuple[str, datetime]:
    code = f"{random.randint(0, 999999):06d}"
    return code, datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES)


def _send_code(user: User) -> None:
    send_email(
        user.email,
        "Your verification code",
        f"Hi {user.full_name},\n\nYour verification code is {user.verification_code}. "
        f"It expires in {CODE_TTL_MINUTES} minutes.",
    )


@router.post("/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone == data.phone).first():
        raise HTTPException(status_code=400, detail="Phone already registered")

    _validate_password(data.password)

    code, expires = _new_code()
    user = User(
        full_name=data.full_name,
        phone=data.phone,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        is_verified=0,
        verification_code=code,
        code_expires_at=expires,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _send_code(user)
    return {
        "message": "Account created. Check your email for a verification code.",
        "phone": user.phone,
        "needs_verification": True,
    }


@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"message": "Already verified"}
    if not user.verification_code or user.verification_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid code")
    if not user.code_expires_at or user.code_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired. Request a new one.")

    user.is_verified = 1
    user.verification_code = None
    user.code_expires_at = None
    db.commit()
    return {"message": "Email verified"}


@router.post("/resend-code")
def resend_code(data: ResendCodeRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"message": "Already verified"}

    code, expires = _new_code()
    user.verification_code = code
    user.code_expires_at = expires
    db.commit()
    db.refresh(user)

    _send_code(user)
    return {"message": "A new code has been sent."}


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # "username" field carries the phone number.
    user = db.query(User).filter(User.phone == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Wrong phone or password")
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        user.email = data.email
    db.commit()
    db.refresh(user)
    return user
