# Sketch to plan prototype

Turns a photo of a hand-drawn garden sketch into a technical garden plan.

1. `sketch_to_layout.py` sends the photo to the Claude API (`claude-opus-5-5`) and gets back a
   structured layout (`layout.py`): beds, paths, patio, shed and plants, with positions in metres.
2. `render_plan.py` draws that layout as a technical plan: 1 m grid, overall dimensions,
   scale bar, north arrow, numbered plant symbols, plant schedule, notes and a title block.

Because the plan is drawn from data, every part of it can be edited in the app later.

```bash
pip install anthropic pydantic
export ANTHROPIC_API_KEY=...
python sketch_to_layout.py my_sketch.jpg --width 8 --depth 12 > layout.json
python render_plan.py layout.json plan.svg
```

`sample_layout.json` and `sample_plan.svg` / `sample_plan.png` show the output style using a
hand-written layout. The Claude step has not been run yet, because this workspace has no API key.

Server-side refusal fallback (`fallbacks: "default"`) is switched on, so if a request is
declined by a safety check it is retried on another Claude model automatically.
