import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


def get_customers(db: Session) -> list[Customer]:
    return list(db.scalars(select(Customer).order_by(Customer.name)))


def get_customer(db: Session, customer_id: int) -> Customer | None:
    return db.get(Customer, customer_id)


def get_customer_by_email(db: Session, email: str) -> Customer | None:
    return db.scalar(select(Customer).where(Customer.email == email))


def create_customer(db: Session, data: CustomerCreate, role: str = "customer") -> Customer:
    customer = Customer(
        name=data.name,
        email=data.email,
        phone=data.phone,
        hashed_password=hash_password(data.password),
        role=role,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def get_or_create_guest(db: Session, email: str) -> Customer:
    """Return the existing customer for this email, or create a guest account.

    Guests receive an unusable random password (they cannot log in) but can
    still be emailed their ticket confirmation."""
    existing = get_customer_by_email(db, email)
    if existing:
        return existing

    guest = Customer(
        name=email.split("@")[0],
        email=email,
        hashed_password=hash_password(secrets.token_urlsafe(32)),
        role="guest",
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


def update_customer(db: Session, customer: Customer, data: CustomerUpdate) -> Customer:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer: Customer) -> None:
    db.delete(customer)
    db.commit()
