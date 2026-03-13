from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    openai_api_key: str
    crawl_delay_min: float = 0.5
    crawl_delay_max: float = 1.5
    headless: bool = True
    batch_size: int = 100  # therapists per embedding batch

    model_config = {"env_file": ".env"}


settings = Settings()
