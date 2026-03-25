"""Application configuration loaded from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Google OAuth / SDM
    google_client_id: str = ""
    google_client_secret: str = ""
    sdm_project_id: str = ""

    # Pub/Sub for camera events
    pubsub_project_id: str = ""
    pubsub_subscription_id: str = ""

    # Schedule
    night_check_hour: int = 22
    night_check_minute: int = 0
    summary_hour: int = 21
    summary_minute: int = 0

    # Paths
    token_path: str = "config/token.json"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def token_file(self) -> Path:
        return Path(self.token_path)

    @property
    def sdm_base_url(self) -> str:
        return f"https://smartdevicemanagement.googleapis.com/v1/enterprises/{self.sdm_project_id}"


settings = Settings()
