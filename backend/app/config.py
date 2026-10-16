from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # These values are read from the .env file (see .env.example).
    DATABASE_URL: str = "sqlite:///./taxi.db"
    SECRET_KEY: str = "change-this-to-a-long-random-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Default pricing in Rwandan Francs. Admin can change prices later
    # by editing the PricingRule row in the database.
    BASE_FARE: float = 1000
    RATE_PER_KM: float = 400
    RATE_PER_MIN: float = 50
    OPENROUTESERVICE_API_KEY: str = ""

    # Email / SMTP (all read from .env; empty means email is disabled).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
