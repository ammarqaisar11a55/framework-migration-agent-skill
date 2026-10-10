import json

import pytest
from pydantic import ValidationError

from app.service import Row, export, load_user, to_json, user_from_row


def test_load_normalises_and_defaults_the_nickname():
    user = load_user({"id": 1, "name": "  Ada Lovelace ", "email": "ADA@Example.org"})
    assert user.name == "Ada Lovelace"
    assert user.email == "ada@example.org"
    assert user.nickname == "Ada"
    assert user.tags == []


def test_nickname_is_optional():
    assert load_user({"id": 2, "name": "Bo", "email": "bo@x.y", "nickname": "B"}).nickname == "B"


def test_invalid_email_and_postcode_are_rejected():
    with pytest.raises(ValidationError):
        load_user({"id": 3, "name": "C", "email": "nope"})
    with pytest.raises(ValidationError):
        load_user({"id": 3, "name": "C", "email": "c@x.y", "address": {"street": "s", "city": "c", "postcode": "bad!"}})


def test_too_many_tags_are_rejected():
    with pytest.raises(ValidationError):
        load_user({"id": 4, "name": "D", "email": "d@x.y", "tags": ["a", "b", "c", "d"]})


def test_users_are_immutable():
    user = load_user({"id": 5, "name": "E", "email": "e@x.y"})
    with pytest.raises((TypeError, ValidationError)):
        user.name = "F"


def test_from_orm_and_export():
    user = user_from_row(Row(id=6, name="Grace Hopper", email="g@x.y", nickname=None, birthday=None, tags=["navy"], address=None))
    assert export(user) == {"id": 6, "name": "Grace Hopper", "email": "g@x.y", "nickname": "Grace", "tags": ["navy"]}
    assert json.loads(to_json(user)) == {"id": 6, "name": "Grace Hopper", "email": "g@x.y", "nickname": "Grace", "birthday": None, "address": None}
