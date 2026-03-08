from pydantic import BaseModel, Field


class RGBColor(BaseModel):
    r: int = Field(ge=0, le=255)
    g: int = Field(ge=0, le=255)
    b: int = Field(ge=0, le=255)


class CardSpec(BaseModel):
    project_id: str = Field(min_length=1)
    card_id: str = Field(min_length=1)
    source_page_id: str = Field(min_length=1)
    source_file_key: str | None = None
    width: int = Field(ge=120, le=1200)
    height: int = Field(ge=120, le=1200)
    color_scheme: str = Field(default="dark", min_length=1)
    background_rgb: RGBColor
    text_rgb: RGBColor
    primary_rgb: RGBColor
    font_family: str = Field(min_length=1)
    font_size: int = Field(ge=8, le=96)
    corner_radius: int = Field(ge=0, le=128)
    title: str = Field(default="Tactile")
    subtitle: str = Field(default="Design with your hands. Shape interfaces through gesture.")
