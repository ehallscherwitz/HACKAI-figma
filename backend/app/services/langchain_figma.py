"""LangChain service that reads Figma page snapshots from MongoDB,
analyzes the project's visual style, and generates adaptive CardPatch
operations so new frames match the existing design."""

from __future__ import annotations

import json
import uuid
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.services.style_extractor import extract_card_spec_from_page_snapshot

ADAPT_SYSTEM_PROMPT = """\
You are a Figma design assistant that creates frames matching an existing
project's visual style.

You will receive:
1. A summary of every node on the current Figma page (types, names, sizes).
2. An extracted style analysis (dominant colors, fonts, corner radii).

Your job: produce a single **CardPatch** JSON that creates a new frame which
looks like it belongs in this project.

### CardPatch format
```json
{
  "patch_id": "<provided>",
  "project_id": "<provided>",
  "card_id": "<provided>",
  "source_event_id": "<provided>",
  "from_version": 1,
  "to_version": 2,
  "operations": [
    {"op": "replace", "path": "/name",          "value": "Adaptive Card"},
    {"op": "replace", "path": "/width",          "value": 400},
    {"op": "replace", "path": "/height",         "value": 300},
    {"op": "replace", "path": "/fill_rgb",       "value": {"r": 243, "g": 244, "b": 246}},
    {"op": "replace", "path": "/text_rgb",       "value": {"r": 20, "g": 20, "b": 20}},
    {"op": "replace", "path": "/corner_radius",  "value": 20},
    {"op": "replace", "path": "/font_family",    "value": "Inter"},
    {"op": "replace", "path": "/font_size",      "value": 24},
    {"op": "replace", "path": "/title",           "value": "Card Title"},
    {"op": "replace", "path": "/subtitle",        "value": "A short description"},
    {"op": "replace", "path": "/color_scheme",   "value": "dark"},
    {"op": "replace", "path": "/liquid_glass",   "value": false}
  ]
}
```

Valid paths and value types:
- /name          – string, a descriptive frame name
- /width         – int 120-1200
- /height        – int 120-1200
- /fill_rgb      – {r,g,b} each 0-255 (background color, overrides color_scheme)
- /text_rgb      – {r,g,b} each 0-255 (label text color)
- /corner_radius – int 0-128
- /font_family   – string (use exact family name from the project)
- /font_size     – int 8-96
- /title         – string, title text shown in the frame
- /subtitle      – string, subtitle text shown below the title
- /color_scheme  – "warm"|"cool"|"dark"|"bright"|"soft"|"moon"
- /liquid_glass  – boolean

Rules:
- Match the project's colors, fonts, and corner radii as closely as possible.
- Pick a width/height that fits with the existing frames on the page.
- Give the frame a contextual name based on the project content.
- Always include ALL operation paths so the frame is fully defined.
- Respond with ONLY the raw JSON, no markdown fences or explanation.
"""


async def _get_latest_snapshot(
    db: AsyncIOMotorDatabase, project_id: str
) -> dict[str, Any] | None:
    snapshot = await db.plugin_page_snapshots.find_one(
        {"project_id": project_id},
        sort=[("updated_at", -1)],
    )
    if snapshot:
        snapshot.pop("_id", None)
    return snapshot


def _summarise_figma_tree(
    node: dict[str, Any], depth: int = 0, max_depth: int = 4
) -> str:
    indent = "  " * depth
    node_type = node.get("type", "?")
    name = node.get("name", "")
    dims = ""
    w, h = node.get("width"), node.get("height")
    if w is not None and h is not None:
        dims = f" ({int(w)}x{int(h)})"

    fills_info = ""
    fills = node.get("fills", [])
    if isinstance(fills, list):
        for fill in fills:
            if isinstance(fill, dict) and fill.get("type") == "SOLID":
                c = fill.get("color", {})
                r = int(round(float(c.get("r", 0)) * 255))
                g = int(round(float(c.get("g", 0)) * 255))
                b = int(round(float(c.get("b", 0)) * 255))
                fills_info = f" fill=rgb({r},{g},{b})"
                break

    font_info = ""
    if node_type == "TEXT":
        style = node.get("style", {})
        fam = style.get("fontFamily", "")
        sz = style.get("fontSize", "")
        chars = (node.get("characters", "") or "")[:40]
        if fam:
            font_info = f' font="{fam}" size={sz}'
        if chars:
            font_info += f' text="{chars}"'

    cr = node.get("cornerRadius")
    cr_info = f" radius={int(cr)}" if cr else ""

    line = f"{indent}- [{node_type}] \"{name}\"{dims}{fills_info}{cr_info}{font_info}"
    lines = [line]

    if depth < max_depth:
        for child in node.get("children", []):
            if isinstance(child, dict):
                lines.append(
                    _summarise_figma_tree(child, depth + 1, max_depth)
                )

    return "\n".join(lines)


def _style_summary(spec: Any) -> str:
    return (
        f"Extracted style:\n"
        f"  Dominant size: {spec.width}x{spec.height}\n"
        f"  Background: rgb({spec.background_rgb.r},{spec.background_rgb.g},{spec.background_rgb.b})\n"
        f"  Text color: rgb({spec.text_rgb.r},{spec.text_rgb.g},{spec.text_rgb.b})\n"
        f"  Primary accent: rgb({spec.primary_rgb.r},{spec.primary_rgb.g},{spec.primary_rgb.b})\n"
        f"  Font: {spec.font_family} {spec.font_size}px\n"
        f"  Corner radius: {spec.corner_radius}px\n"
        f"  Color scheme: {spec.color_scheme}"
    )


async def generate_adaptive_frame(
    db: AsyncIOMotorDatabase,
    project_id: str,
    card_id: str,
) -> dict[str, Any]:
    """Read the latest Figma snapshot from MongoDB, analyze the project's
    visual style using the style extractor + Gemini, and return a CardPatch
    that creates a frame matching the project."""
    if not settings.google_api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured.")

    snapshot = await _get_latest_snapshot(db, project_id)
    if not snapshot or not snapshot.get("page_json"):
        raise ValueError(
            "No page snapshot found. Open the Figma plugin and let it send "
            "a snapshot first."
        )

    page_json = snapshot["page_json"]
    page_id = snapshot.get("page_id", "unknown")
    file_key = snapshot.get("file_key")

    tree_summary = _summarise_figma_tree(page_json)

    spec = extract_card_spec_from_page_snapshot(
        project_id=project_id,
        card_id=card_id,
        source_file_key=file_key,
        source_page_id=page_id,
        page_json=page_json,
    )
    style_text = _style_summary(spec)

    patch_id = str(uuid.uuid4())
    event_id = f"ai-adapt-{uuid.uuid4()}"

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.google_api_key,
        temperature=0.3,
    )

    messages = [
        SystemMessage(content=ADAPT_SYSTEM_PROMPT),
        HumanMessage(content=(
            f"## Current Figma page (project={project_id}, page={page_id})\n\n"
            f"{tree_summary}\n\n"
            f"---\n\n"
            f"{style_text}\n\n"
            f"---\n\n"
            f"patch_id: {patch_id}\n"
            f"project_id: {project_id}\n"
            f"card_id: {card_id}\n"
            f"source_event_id: {event_id}\n\n"
            f"Create a new frame that fits visually with this project. "
            f"Match the colors, fonts, corner radii, and sizing. "
            f"Respond with ONLY the JSON."
        )),
    ]

    response = await llm.ainvoke(messages)
    raw = response.content.strip()

    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    patch: dict[str, Any] = json.loads(raw)

    patch.setdefault("patch_id", patch_id)
    patch.setdefault("project_id", project_id)
    patch.setdefault("card_id", card_id)
    patch.setdefault("source_event_id", event_id)
    patch.setdefault("from_version", 1)
    patch.setdefault("to_version", 2)

    return patch


async def generate_frame_patch(
    db: AsyncIOMotorDatabase,
    project_id: str,
    card_id: str,
    user_prompt: str,
) -> dict[str, Any]:
    """Prompt-driven frame generation. If a snapshot exists the LLM sees
    it for context, otherwise it creates a generic frame."""
    if not settings.google_api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured.")

    snapshot = await _get_latest_snapshot(db, project_id)

    context_block = "No page snapshot available yet."
    if snapshot and snapshot.get("page_json"):
        page_json = snapshot["page_json"]
        context_block = (
            f"Current Figma page (project={project_id}):\n"
            + _summarise_figma_tree(page_json)
        )

    patch_id = str(uuid.uuid4())
    event_id = f"ai-{uuid.uuid4()}"

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.google_api_key,
        temperature=0.2,
    )

    messages = [
        SystemMessage(content=ADAPT_SYSTEM_PROMPT),
        HumanMessage(content=(
            f"{context_block}\n\n"
            f"---\n"
            f"patch_id: {patch_id}\n"
            f"project_id: {project_id}\n"
            f"card_id: {card_id}\n"
            f"source_event_id: {event_id}\n\n"
            f"User request: {user_prompt}\n\n"
            f"Respond with ONLY the JSON CardPatch object."
        )),
    ]

    response = await llm.ainvoke(messages)
    raw = response.content.strip()

    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    patch: dict[str, Any] = json.loads(raw)

    patch.setdefault("patch_id", patch_id)
    patch.setdefault("project_id", project_id)
    patch.setdefault("card_id", card_id)
    patch.setdefault("source_event_id", event_id)
    patch.setdefault("from_version", 1)
    patch.setdefault("to_version", 2)

    return patch
