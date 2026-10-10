from inventory.stock import Item, from_wire, restock, snapshot, trusted


def test_restock_returns_a_new_item():
    item = Item(sku="A1", quantity=2)
    more = restock(item, 3)
    assert (item.quantity, more.quantity) == (2, 5)


def test_from_wire_parses_json():
    assert from_wire('{"sku": "B2", "quantity": 7}') == Item(sku="B2", quantity=7)


def test_trusted_skips_validation():
    assert trusted({"sku": "C3", "quantity": "lots"}).quantity == "lots"


def test_snapshot_leaves_out_defaults():
    assert snapshot(Item(sku="D4", quantity=1)) == {"sku": "D4", "quantity": 1}
