"""Send a photo of a garden sketch to Claude and get back a GardenLayout.

Usage:
    python sketch_to_layout.py sketch.jpg --width 10 --depth 15 > layout.json

Needs ANTHROPIC_API_KEY set (or an `ant auth login` profile).
"""

import argparse
import base64
import mimetypes
import sys

import anthropic

from layout import GardenLayout

SYSTEM = """You turn hand-drawn garden sketches into a precise layout for a technical garden plan.

Read the sketch carefully: shapes, labels, arrows, measurements and notes. Use any
measurements written on the sketch. Where there are none, estimate sizes from
proportions against the overall garden size you are given, and record each guess in
`assumptions`.

Rules:
- Coordinates are metres. (0, 0) is the top-left corner of the garden on the page;
  x grows to the right, y grows down the page.
- Keep every feature inside the garden boundary, and keep features from overlapping
  unless the sketch shows them overlapping (a path crossing a lawn is fine).
- Beds, lawns, patios and paths are polygons. Trees, ponds and round features can be circles.
- Where the sketch names plants, place them inside their bed with realistic mature
  spreads. Where a bed is drawn but not planted, suggest 2 to 4 plants suited to a
  typical home garden and say so in `assumptions`.
- Use common plant names that a home gardener would recognise, with the Latin name.
- Put garden furniture in `furniture`: anything drawn or named on the sketch, such
  as a table and chairs, bench or loungers. Where a patio or decking has no seating,
  suggest a sensible set (for example a dining set for 4 to 6) and say so in
  `assumptions`. Keep furniture on hard surfaces or lawn, never in beds."""


def sketch_to_layout(image_path: str, width_m: float, depth_m: float, notes: str = "") -> GardenLayout:
    media_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    prompt = f"The garden is about {width_m} m wide and {depth_m} m deep."
    if notes:
        prompt += f" Notes from the gardener: {notes}"

    client = anthropic.Anthropic()
    response = client.beta.messages.parse(
        model="claude-opus-5-5",
        max_tokens=16000,
        thinking={"type": "adaptive"},
        output_config={"effort": "high"},
        # If the request is declined by a safety check, retry on a fallback model.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                {"type": "text", "text": prompt},
            ],
        }],
        output_format=GardenLayout,
    )

    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined to read this sketch.")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("The layout was cut off. Try a simpler sketch or raise max_tokens.")
    return response.parsed_output


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--width", type=float, required=True, help="Garden width in metres")
    ap.add_argument("--depth", type=float, required=True, help="Garden depth in metres")
    ap.add_argument("--notes", default="")
    args = ap.parse_args()
    try:
        layout = sketch_to_layout(args.image, args.width, args.depth, args.notes)
    except anthropic.APIConnectionError as e:
        sys.exit(f"Could not reach the Claude API: {e}")
    except anthropic.APIStatusError as e:
        sys.exit(f"Claude API error {e.status_code}: {e.message}")
    print(layout.model_dump_json(indent=2))
