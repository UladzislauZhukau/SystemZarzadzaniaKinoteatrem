from pydantic import BaseModel, EmailStr

from app.schemas.customer import CustomerRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CustomerRead
