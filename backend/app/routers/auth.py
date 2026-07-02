from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.crud import customer as customer_crud
from app.db.session import get_db
from app.deps import get_current_user
from app.models.customer import Customer
from app.schemas.auth import LoginRequest, Token
from app.schemas.customer import CustomerCreate, CustomerRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: CustomerCreate, db: Session = Depends(get_db)):
    if customer_crud.get_customer_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = customer_crud.create_customer(db, data)
    token = create_access_token(subject=user.email, role=user.role)
    return Token(access_token=token, user=CustomerRead.model_validate(user))


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = customer_crud.get_customer_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(subject=user.email, role=user.role)
    return Token(access_token=token, user=CustomerRead.model_validate(user))


@router.get("/me", response_model=CustomerRead)
def me(current_user: Customer = Depends(get_current_user)):
    return current_user
