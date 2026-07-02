from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://admin:secret@db:5432/kinoteatr"

    # JWT
    SECRET_KEY: str = "change-me-to-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Loyalty
    LOYALTY_THRESHOLD: int = 5
    LOYALTY_DISCOUNT_RATE: float = 0.10

    # OMDb (IMDb data) - free API key from https://www.omdbapi.com/apikey.aspx
    OMDB_API_KEY: str = ""
    OMDB_URL: str = "http://www.omdbapi.com/"

    # TMDb (trailers) - free API key from https://www.themoviedb.org/settings/api
    TMDB_API_KEY: str = ""
    TMDB_API_URL: str = "https://api.themoviedb.org/3"
    TMDB_YOUTUBE_EMBED: str = "https://www.youtube.com/embed/"

    # Email
    MAIL_SUPPRESS_SEND: bool = True
    MAIL_USERNAME: str = "your@email.com"
    MAIL_PASSWORD: str = "your-app-password"
    MAIL_FROM: str = "no-reply@example.com"
    MAIL_FROM_NAME: str = "Kinoteatr"
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False


settings = Settings()
