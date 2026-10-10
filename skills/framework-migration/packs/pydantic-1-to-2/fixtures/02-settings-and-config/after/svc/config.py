from typing import List

from pydantic import field_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///local.db"
    debug: bool = False
    allowed_hosts: List[str] = ["localhost"]
    workers: int = Field(2, ge=1, le=16)
    model_config = SettingsConfigDict(env_prefix="SVC_")

    @field_validator("allowed_hosts", mode="before")
    @classmethod
    def split_hosts(cls, value):
        if isinstance(value, str) and not value.startswith("["):
            return [host.strip() for host in value.split(",") if host.strip()]
        return value
