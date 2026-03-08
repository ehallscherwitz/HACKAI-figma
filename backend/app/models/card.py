from pydantic import BaseModel, Field

BUILTIN_SCHEMES = {"warm", "cool", "dark", "bright", "soft"}


class CardState(BaseModel):
    project_id: str = Field(default="default", min_length=1)
    card_id: str = Field(min_length=1)
    version: int = Field(default=1, ge=1)
    width: int = Field(default=320, ge=120, le=1200)
    height: int = Field(default=200, ge=120, le=1200)
    color_scheme: str = Field(default="dark", min_length=1)
    liquid_glass: bool = False
    title: str = Field(default="Tactile")
    subtitle: str = Field(default="Design with your hands. Shape interfaces through gesture.")
    font_family: str = Field(default="Inter")
    font_size: int = Field(default=24, ge=8, le=96)
    corner_radius: int = Field(default=20, ge=0, le=128)
