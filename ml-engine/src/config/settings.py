from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    ml_engine_host: str = "0.0.0.0"
    ml_engine_port: int = 8000
    model_path: str = "./models/trained"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
