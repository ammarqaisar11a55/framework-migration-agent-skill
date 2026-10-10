from __future__ import annotations

from enum import Enum
from typing import Generic, List, Optional, TypeVar

from pydantic import field_validator, ConfigDict, BaseModel, validator

T = TypeVar("T")


class Category(str, Enum):
    BOOK = "book"
    GAME = "game"


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    next_page: Optional[int] = None

    # TODO[pydantic]: We couldn't refactor the `validator`, please replace it by `field_validator` manually.
    # Check https://docs.pydantic.dev/dev-v2/migration/#changes-to-validators for more information.
    @validator("total", always=True)
    def total_covers_items(cls, value, values):
        if value < len(values.get("items", [])):
            raise ValueError("total is smaller than the page")
        return value


class Product(BaseModel):
    sku: str
    category: Category
    keywords: List[str] = []
    parent: Optional[Product] = None
    model_config = ConfigDict(use_enum_values=True)

    @field_validator("sku")
    @classmethod
    def sku_upper(cls, value):
        return value.upper()

    # TODO[pydantic]: We couldn't refactor the `validator`, please replace it by `field_validator` manually.
    # Check https://docs.pydantic.dev/dev-v2/migration/#changes-to-validators for more information.
    @validator("keywords", each_item=True)
    def keyword_lower(cls, value):
        return value.strip().lower()


Product.update_forward_refs()
