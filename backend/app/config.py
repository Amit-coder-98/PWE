from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    mongodb_url: str | None = None
    mongodb_database: str = "prabodhan_bag_test"
    jwt_secret: str | None = None
    frontend_origins: str = "http://localhost:5173"
    cookie_secure: bool = False
    access_minutes: int = 15
    refresh_days: int = 7
    r2_account_id: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket: str | None = None
    cron_secret: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [value.strip() for value in self.frontend_origins.split(",") if value.strip()]

    @property
    def auth_ready(self) -> bool:
        return bool(self.jwt_secret and len(self.jwt_secret) >= 32)

    @property
    def storage_ready(self) -> bool:
        return all((self.r2_account_id, self.r2_access_key_id, self.r2_secret_access_key, self.r2_bucket))


@lru_cache
def get_settings() -> Settings:
    return Settings()
