from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, root_validator, validator


class Address(BaseModel):
    street: str
    city: str
    postcode: str = Field(..., regex=r"^[A-Z0-9 ]{3,8}$")


class User(BaseModel):
    id: int
    name: str = Field(..., min_length=1, max_length=50)
    email: str
    nickname: Optional[str]
    birthday: Optional[date] = None
    tags: List[str] = Field(default_factory=list, max_items=3)
    address: Optional[Address] = None

    class Config:
        allow_mutation = False
        anystr_strip_whitespace = True
        orm_mode = True

    @validator("email")
    def email_has_at(cls, value):
        if "@" not in value:
            raise ValueError("not an email address")
        return value.lower()

    @root_validator
    def nickname_defaults_to_name(cls, values):
        if not values.get("nickname") and values.get("name"):
            values["nickname"] = values["name"].split()[0]
        return values
