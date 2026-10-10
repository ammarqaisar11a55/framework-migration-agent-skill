import pytest
from pydantic import ValidationError

from svc.api import Order, parse_order
from svc.config import Settings


def test_settings_defaults(monkeypatch):
    for name in ["SVC_DATABASE_URL", "SVC_DEBUG", "SVC_ALLOWED_HOSTS", "SVC_WORKERS"]:
        monkeypatch.delenv(name, raising=False)
    settings = Settings()
    assert settings.database_url == "sqlite:///local.db"
    assert settings.allowed_hosts == ["localhost"]


def test_settings_from_prefixed_environment(monkeypatch):
    monkeypatch.setenv("SVC_DEBUG", "true")
    monkeypatch.setenv("SVC_ALLOWED_HOSTS", '["a.example", "b.example"]')
    monkeypatch.setenv("SVC_WORKERS", "4")
    settings = Settings()
    assert settings.debug is True
    assert settings.allowed_hosts == ["a.example", "b.example"]
    assert settings.workers == 4


def test_hosts_given_as_a_comma_separated_string(monkeypatch):
    monkeypatch.delenv("SVC_ALLOWED_HOSTS", raising=False)
    assert Settings(allowed_hosts="a.example, b.example").allowed_hosts == ["a.example", "b.example"]


def test_settings_validate_ranges(monkeypatch):
    monkeypatch.setenv("SVC_WORKERS", "99")
    with pytest.raises(ValidationError):
        Settings()


def test_orders_accept_aliases_and_field_names():
    assert parse_order({"orderId": 1, "customerName": "Ada"}).customer_name == "Ada"
    assert parse_order({"order_id": 2, "customer_name": "Bo"}).order_id == 2


def test_orders_reject_unknown_fields():
    with pytest.raises(ValidationError):
        parse_order({"orderId": 3, "customerName": "C", "coupon": "FREE"})


def test_order_schema_has_the_example():
    schema = Order.schema()
    assert schema["example"] == {"orderId": 1, "customerName": "Ada"}
