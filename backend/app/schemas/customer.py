from pydantic import BaseModel, ConfigDict, EmailStr


class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None


class CustomerCreate(CustomerBase):
    password: str


class CustomerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: str
    total_reservations: int
