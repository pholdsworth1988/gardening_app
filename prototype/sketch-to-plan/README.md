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

## Using it from the app

The app never holds the API key. It sends the photo to `server.py`, which calls Claude:

```bash
export ANTHROPIC_API_KEY=...
python server.py            # or: python server.py --fake  (sample layout, no key needed)
cd ../../app && EXPO_PUBLIC_HEDGE_API_URL=http://<this computer's IP>:8787 npx expo start
```

The app turns the reply into an editable plan (`app/src/data/ai.ts`): circles become
polygons, plants are matched to the plant library (new ones are added), and the layout is
fitted to the size the user typed. Without `EXPO_PUBLIC_HEDGE_API_URL` the app uses the
sample layout, as in the web preview.

`sample_layout.json` and `sample_plan.svg` / `sample_plan.png` show the output style using a
hand-written layout. The Claude step has not been run yet, because this workspace has no API key.

Server-side refusal fallback (`fallbacks: "default"`) is switched on, so if a request is
declined by a safety check it is retried on another Claude model automatically.
