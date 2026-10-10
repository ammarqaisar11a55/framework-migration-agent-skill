from typing import Optional

from pydantic import BaseModel, Extra, Field


class Order(BaseModel):
    order_id: int = Field(..., alias="orderId")
    customer_name: str = Field(..., alias="customerName")
    note: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        extra = Extra.forbid
        schema_extra = {"example": {"orderId": 1, "customerName": "Ada"}}


def parse_order(payload: dict) -> Order:
    return Order(**payload)
