"""Assemble the single-file offline game (and an Artifact-ready fragment)."""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src, dist, docs = root / 'src', root / 'dist', root / 'docs'
dist.mkdir(exist_ok=True); docs.mkdir(exist_ok=True)
font = base64.b64encode((root / 'build/fonts/sign.woff').read_bytes()).decode()
css = (src / 'style.css').read_text().replace('__SIGN_FONT__', font)
body = (src / 'body.html').read_text()
data = (root / 'src/data.js').read_text()
app = (src / 'app.js').read_text()
title = 'United States Map Quest'
inner = f'''<title>{title}</title>
<style>
{css}</style>
{body}
<script>
{data}</script>
<script>
{app}</script>
'''
full = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="description" content="An offline map game that teaches the 50 United States: puzzle, neighbors, name that state, and where is it.">
{inner}</head>'''
# keep head/body structure valid: move body content after </head>
full = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="description" content="An offline map game that teaches the 50 United States.">
<title>{title}</title>
<style>
{css}</style>
</head>
<body>
{body}
<script>
{data}</script>
<script>
{app}</script>
</body>
</html>
'''
(root / 'us-map-quest.html').write_text(full)   # the game: one file, open it in any browser
(docs / 'index.html').write_text(full)         # same file, for GitHub Pages
(dist / 'us-map-quest.html').write_text(full)  # copy for local testing
(dist / 'artifact.html').write_text(inner)     # body-only variant for publishing as a Claude Artifact
print('us-map-quest.html', len(full.encode()), 'bytes')
