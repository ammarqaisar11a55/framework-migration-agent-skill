from .models import User


class Row:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def load_user(payload: dict) -> User:
    return User.parse_obj(payload)


def user_from_row(row: Row) -> User:
    return User.from_orm(row)


def export(user: User) -> dict:
    return user.dict(exclude_none=True)


def to_json(user: User) -> str:
    return user.json(exclude={"tags"})
