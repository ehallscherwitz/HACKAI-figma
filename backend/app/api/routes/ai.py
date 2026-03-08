from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.api.dependencies import require_mongo
from app.services.langchain_figma import generate_adaptive_frame, generate_frame_patch
from app.services.plugin_sync import dispatch_patch_to_plugin

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateFrameRequest(BaseModel):
    project_id: str = Field(default="default", min_length=1)
    card_id: str = Field(default="card-1", min_length=1)
    prompt: str = Field(min_length=1, max_length=2000)


class AdaptFrameRequest(BaseModel):
    project_id: str = Field(default="default", min_length=1)
    card_id: str = Field(default="card-1", min_length=1)


@router.post("/generate-frame")
async def generate_frame(
    body: GenerateFrameRequest,
    db: AsyncIOMotorDatabase = Depends(require_mongo),
) -> dict[str, Any]:
    """Prompt-driven: user describes what they want, LLM generates a patch."""
    try:
        patch = await generate_frame_patch(
            db=db,
            project_id=body.project_id,
            card_id=body.card_id,
            user_prompt=body.prompt,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {exc}")

    await db.card_patches.insert_one({**patch, "delivery_status": "pending"})
    await dispatch_patch_to_plugin(db, body.project_id, patch)

    return {"status": "ok", "patch": patch}


@router.post("/adapt-frame")
async def adapt_frame(
    body: AdaptFrameRequest,
    db: AsyncIOMotorDatabase = Depends(require_mongo),
) -> dict[str, Any]:
    """Automatic: reads the Figma snapshot, analyzes the project's style,
    and creates a frame that matches — no prompt needed."""
    try:
        patch = await generate_adaptive_frame(
            db=db,
            project_id=body.project_id,
            card_id=body.card_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {exc}")

    await db.card_patches.insert_one({**patch, "delivery_status": "pending"})
    await dispatch_patch_to_plugin(db, body.project_id, patch)

    return {"status": "ok", "patch": patch}
