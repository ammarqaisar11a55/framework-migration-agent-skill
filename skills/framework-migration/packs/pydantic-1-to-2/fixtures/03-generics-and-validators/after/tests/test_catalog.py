import pytest
from pydantic import ValidationError

from catalog.models import Page, Product


def test_products_normalise_sku_and_keywords():
    product = Product(sku="ab-1", category="book", keywords=[" Sci-Fi ", "CLASSIC"])
    assert product.sku == "AB-1"
    assert product.keywords == ["sci-fi", "classic"]
    assert product.category == "book"


def test_products_nest():
    child = Product(sku="c", category="game", parent={"sku": "p", "category": "game"})
    assert child.parent.sku == "P"


def test_unknown_category_is_rejected():
    with pytest.raises(ValidationError):
        Product(sku="x", category="toy")


def test_generic_page_validates_its_items():
    page = Page[Product](items=[{"sku": "a", "category": "book"}], total=3, next_page=2)
    assert page.items[0].sku == "A"
    with pytest.raises(ValidationError):
        Page[int](items=["not a number"], total=1)


def test_total_must_cover_the_page():
    with pytest.raises(ValidationError):
        Page[int](items=[1, 2, 3], total=2)
