from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "JooJooLand Pitch API"
    env: str = "development"

    database_url: str = "sqlite:///./joojooland.db"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_min: int = 60 * 24

    admin_email: str = "choonwoo49@gmail.com"
    admin_password: str = "changeme-on-first-boot"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    openclaw_ws_url: str = "ws://192.168.219.117:18789"
    openclaw_agent_pet: str = "joojoo-pet-agent"
    openclaw_model_default: str = "anthropic/claude-opus-4-7"
    openclaw_model_agent: str = "openai-codex/gpt-5.4"
    openclaw_model_vision: str = "anthropic/claude-sonnet-4-6"

    ue5_signaling_url: str = "ws://192.168.219.117:8888"
    ue5_pixel_streamer_url: str = "http://192.168.219.117:8080"

    vworld_api_key: str = ""
    cesium_ion_token: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
