from __future__ import annotations

from enum import Enum
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, validator
from pydantic.generics import GenericModel

T = TypeVar("T")


class Category(str, Enum):
    BOOK = "book"
    GAME = "game"


class Page(GenericModel, Generic[T]):
    items: List[T]
    total: int
    next_page: Optional[int] = None

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

    class Config:
        use_enum_values = True

    @validator("sku")
    def sku_upper(cls, value):
        return value.upper()

    @validator("keywords", each_item=True)
    def keyword_lower(cls, value):
        return value.strip().lower()


Product.update_forward_refs()
