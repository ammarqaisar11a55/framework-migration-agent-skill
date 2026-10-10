from datetime import date
from typing import List, Optional

from pydantic import field_validator, ConfigDict, BaseModel, Field, root_validator


class Address(BaseModel):
    street: str
    city: str
    postcode: str = Field(..., pattern=r"^[A-Z0-9 ]{3,8}$")


class User(BaseModel):
    id: int
    name: str = Field(..., min_length=1, max_length=50)
    email: str
    nickname: Optional[str] = None
    birthday: Optional[date] = None
    tags: List[str] = Field(default_factory=list, max_length=3)
    address: Optional[Address] = None
    model_config = ConfigDict(frozen=True, str_strip_whitespace=True, from_attributes=True)

    @field_validator("email")
    @classmethod
    def email_has_at(cls, value):
        if "@" not in value:
            raise ValueError("not an email address")
        return value.lower()

    @root_validator(skip_on_failure=True)
    def nickname_defaults_to_name(cls, values):
        if not values.get("nickname") and values.get("name"):
            values["nickname"] = values["name"].split()[0]
        return values
