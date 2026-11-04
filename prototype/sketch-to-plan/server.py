"""A small web server the Hedge app calls to read a sketch.

The app must never hold the Claude API key, so it sends the photo here and this
server calls Claude. Run it on your computer while testing:

    export ANTHROPIC_API_KEY=...
    python server.py                 # real Claude calls
    python server.py --fake          # returns sample_layout.json, no key needed

Then build the app with EXPO_PUBLIC_HEDGE_API_URL=http://<your computer's IP>:8787.

POST /layout  {"image_base64", "media_type", "width_m", "depth_m", "notes"}
           -> GardenLayout JSON (see layout.py), or {"error": "..."} with a 4xx/5xx status.
"""

import argparse
import json
import pathlib
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from layout import GardenLayout

HERE = pathlib.Path(__file__).parent
MAX_BODY = 20 * 1024 * 1024  # photos are sent as base64, so allow up to about 15 MB images
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def make_handler(fake: bool):
    class Handler(BaseHTTPRequestHandler):
        def _send(self, status: int, body: dict | str):
            data = body if isinstance(body, str) else json.dumps(body)
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            self.wfile.write(data.encode())

        def do_OPTIONS(self):
            self._send(204, "")

        def do_GET(self):
            if self.path == "/health":
                self._send(200, {"ok": True, "fake": fake})
            else:
                self._send(404, {"error": "Not found"})

        def do_POST(self):
            if self.path != "/layout":
                return self._send(404, {"error": "Not found"})
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > MAX_BODY:
                return self._send(413, {"error": "The photo is too large. Try a smaller one."})
            try:
                req = json.loads(self.rfile.read(length))
                image, media_type = req["image_base64"], req.get("media_type", "image/jpeg")
                width_m, depth_m = float(req["width_m"]), float(req["depth_m"])
                notes = str(req.get("notes", ""))[:1000]
            except (ValueError, KeyError, TypeError):
                return self._send(400, {"error": "The request was missing the photo or garden size."})
            if media_type not in ALLOWED_TYPES:
                return self._send(400, {"error": "Send the sketch as a JPEG, PNG, WebP or GIF photo."})

            started = time.time()
            if fake:
                layout = GardenLayout.model_validate_json((HERE / "sample_layout.json").read_text())
                layout.width_m, layout.depth_m = width_m, depth_m
            else:
                import anthropic
                from sketch_to_layout import image_to_layout
                try:
                    layout = image_to_layout(image, media_type, width_m, depth_m, notes)
                except anthropic.APIStatusError as e:
                    return self._send(502, {"error": f"Claude API error {e.status_code}: {e.message}"})
                except anthropic.APIConnectionError:
                    return self._send(502, {"error": "Could not reach the Claude API."})
                except RuntimeError as e:
                    return self._send(422, {"error": str(e)})
            print(f"layout: {len(layout.features)} features, {len(layout.plants)} plants in {time.time() - started:.1f}s", file=sys.stderr)
            self._send(200, layout.model_dump_json())

    return Handler


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--fake", action="store_true", help="Return the sample layout instead of calling Claude")
    args = ap.parse_args()
    print(f"Hedge sketch server on http://0.0.0.0:{args.port} ({'fake' if args.fake else 'Claude'})", file=sys.stderr)
    ThreadingHTTPServer(("0.0.0.0", args.port), make_handler(args.fake)).serve_forever()
