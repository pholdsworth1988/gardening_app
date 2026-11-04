"""Turn the Expo web export (dist/) into one self-contained HTML file for sharing a preview.

Run after `npm run export:web`:
    python3 scripts/make_preview.py dist preview.html
"""
import base64
import pathlib
import re
import sys

dist = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])

html = (dist / "index.html").read_text()
src = re.search(r'<script src="(/_expo/[^"]+)"', html).group(1)
js = (dist / src.lstrip("/")).read_text()

# Inline every image the bundle points at, so nothing loads from an absolute path.
def to_data_uri(m):
    path = dist / m.group(1).lstrip("/")
    if not path.exists():
        return m.group(0)
    return '"data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode() + '"'

js = re.sub(r'"(/assets/[^"]+\.png)"', to_data_uri, js)
js = js.replace("</script", "<\\/script")

style = re.search(r"<style id=\"expo-reset\">.*?</style>", html, re.S).group(0)
page = f"""<title>Hedge</title>
{style}
<style>html, body {{ background: #f6f7f3; color: #1d2420; }}</style>
<div id="root"></div>
<script>{js}</script>
"""
out.write_text(page)
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
