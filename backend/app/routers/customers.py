from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import customer as customer_crud
from app.db.session import get_db
from app.deps import get_current_user, require_admin
from app.models.customer import Customer
from app.schemas.customer import CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerRead],
            dependencies=[Depends(require_admin)])
def list_customers(db: Session = Depends(get_db)):
    return customer_crud.get_customers(db)


@router.get("/me", response_model=CustomerRead)
def read_profile(current_user: Customer = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=CustomerRead)
def update_profile(
    data: CustomerUpdate,
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return customer_crud.update_customer(db, current_user, data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = customer_crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer_crud.delete_customer(db, customer)
