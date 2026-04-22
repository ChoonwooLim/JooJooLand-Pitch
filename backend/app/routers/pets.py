from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from ..core.db import get_session
from ..core.security import current_user_claims
from ..models.pet import Pet

router = APIRouter(prefix="/api/pets", tags=["pets"])


class PetIn(BaseModel):
    name: str
    species: str = "dog"
    breed: str | None = None


@router.get("")
def list_my_pets(db: Session = Depends(get_session), claims: dict = Depends(current_user_claims)):
    uid = claims.get("uid")
    items = db.exec(select(Pet).where(Pet.owner_id == uid)).all()
    return {"items": [p.model_dump() for p in items]}


@router.post("", status_code=201)
def create_pet(body: PetIn, db: Session = Depends(get_session), claims: dict = Depends(current_user_claims)):
    uid = claims.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="uid missing")
    pet = Pet(owner_id=uid, name=body.name, species=body.species, breed=body.breed)
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet.model_dump()
