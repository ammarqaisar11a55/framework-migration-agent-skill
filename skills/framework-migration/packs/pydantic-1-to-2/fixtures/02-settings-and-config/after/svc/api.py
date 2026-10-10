from typing import Optional

from pydantic import ConfigDict, BaseModel, Field


class Order(BaseModel):
    order_id: int = Field(..., alias="orderId")
    customer_name: str = Field(..., alias="customerName")
    note: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True, extra="forbid", json_schema_extra={"example": {"orderId": 1, "customerName": "Ada"}})


def parse_order(payload: dict) -> Order:
    return Order(**payload)
