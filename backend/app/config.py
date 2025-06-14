# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AppSettings(BaseSettings):
    """Configuration settings for the Local Butler AI backend."""

    GEMINI_API_KEY: str
    LOCAL_BUTLER_API_KEY: str # Add this line
    DEFAULT_MODEL: str = "gemini-2.0-flash"
    LOG_LEVEL: str = "INFO"

    # For Pydantic V2, model_config is used instead of class Config
    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", ".env"
        ), # Looks for .env file in the backend/ directory
        extra="ignore"
    )

# Load settings
settings = AppSettings()

# Log to confirm API key presence (optional, for debugging)
if settings.GEMINI_API_KEY:
    logger.info("Gemini API key found in configuration.")
else:
    logger.warning("Gemini API key not found in configuration.")

if settings.LOCAL_BUTLER_API_KEY:
    logger.info("Local Butler API key found in configuration.")
else:
    logger.warning("Local Butler API key not found in configuration.")