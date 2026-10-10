from typing import Dict

from pydantic import BaseModel


class Item(BaseModel):
    sku: str
    quantity: int = 0
    location: str = "main"


def restock(item: Item, amount: int) -> Item:
    return item.copy(update={"quantity": item.quantity + amount})


def from_wire(raw: str) -> Item:
    return Item.parse_raw(raw)


def trusted(data: Dict[str, object]) -> Item:
    # Data from our own database: skip validation for speed.
    return Item.construct(**data)


def snapshot(item: Item) -> Dict[str, object]:
    return item.dict(exclude_defaults=True)
