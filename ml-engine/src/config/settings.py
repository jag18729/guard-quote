from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    ml_engine_host: str = "0.0.0.0"
    ml_engine_port: int = 8000
    model_path: str = "./models/trained"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
