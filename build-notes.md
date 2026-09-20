# United States Map Quest — build notes (v1)

The playable game is `claude/us-map-quest.html` in this project: one self-contained HTML file (~190 KB) that runs offline in any modern browser. No network calls (verified with all network blocked).
A private online copy was also published as an Artifact (same content) for quick testing and sharing.

## Decisions from Altezza (first build)
- Audience: grades K–5, with an **Easy / Hard** switch.
- Answers: **tap on Easy, type on Hard** (typing forgives small spelling slips).
- Extras wanted: sounds & celebrations, read-aloud prompts, practice by region, Explore mode + stars.

## Modes
| Mode | Easy | Hard |
|---|---|---|
| Puzzle Builder | Dashed outlines on the board, names on pieces, generous snap, hint after 2 misses | Blank silhouette board, no names on pieces, tighter snap, hint after 3 misses |
| Neighbor Detective (5 states/round) | Word bank of names (real neighbors + nearby decoys), can also tap the map | Type neighbor names |
| Name That State (10/round) | Mystery state glows orange on map + big shape card; 3 name buttons, 2 tries | Type the name, 2 tries, optional "first letter" hint (halves the points) |
| Where Is It? (10/round) | 3 tries: miss 1 → region hint (or neighbor hint inside a region), miss 2 → blinking circle | 2 tries, no hints |
| Which Way? (10/round) | 4 cardinal directions; tap the compass or tap states on the map | All 8 directions (adds NE/NW/SE/SW); typed state names; some pairs are far apart, not just neighbors |
| Explore the Map | Tap any state: name, postal code, capital (★ on map), region, neighbor chips; toggles for names and capitals | — |

- **Which Way?** mixes three question shapes: "Alabama is ____ of Tennessee" (tap a compass direction), "Name 2 states west of Colorado" (tap or type two states), and "Arkansas is west of which state?" (the reversed phrasing kids find hardest). A compass rose is drawn on the map around the state in question, with a dashed arrow for the first shape.
- Puzzle shows 6 pieces at a time ("Show different pieces" swaps them). Drag or tap-a-piece-then-tap-the-map both work. Pieces are drawn at roughly relative size (Texas big, Rhode Island small).
- Region filter applies to every mode (Neighbor Detective skips Alaska and Hawaii, which have no neighbors).
- Scoring: first try = 1 point, second = ½ (Where Is It third = ¼). Stars: ≥90% → 3, ≥60% → 2, otherwise 1. Best stars per game are saved in the browser (localStorage) and shown on the home screen signs.
- Sounds are synthesized with Web Audio (works offline). Read-aloud uses the device's built-in voices (prefers offline/local voices); a speaker button repeats each prompt.

## How directions are decided (Which Way?)
- Each state carries its true centre as latitude/longitude (`ll`), obtained by inverse-projecting the area centroid of its map outline, plus the centre as drawn on the map (`ct`).
- Directions use the compass bearing between those two centres, so answers match what a teacher would check on a globe.
- **Asking:** a pair is only used as a question when the bearing is within 15° of the direction's centre AND the on-map bearing agrees within 24°, so the map never contradicts the answer. 240 generated questions were checked against an independent calculation: worst case 15° off, no bad questions.
- **Accepting:** an answer counts when it is within 33.75° of the direction — a little looser than the question, so sensible answers are not rejected. A wrong answer is told what direction it actually is ("California is west of Iowa — I need one that's east"), which is where the learning happens.
- Alaska and Hawaii are drawn in inset boxes, so their map position is not their real position. They are left out of direction questions, and tapping them explains why.

## The tilted board (added Sept 20, 2026)
- `MapView` keeps a `TILT` factor: 1 = flat, 0.85 = tilted. Drawing y = `305*(1-TILT) + TILT*y`; `ty()` and `iy()` convert both ways, and `toMap()` un-leans pointer positions so every caller still works in plain map coordinates.
- Only the board group is squashed (land, coastline, tap boxes, hover outline, the on-map compass rose). Labels, capital stars, pulses, arrows and the corner compass are positioned through `ty()` but never squashed, so text stays upright.
- The land's edge is a second copy of every state path, offset down by `DEPTH / TILT` and painted slate; it shows only when tilted (`.map.tilted .walls`).
- Puzzle pieces and the shape cards in Name That State are squashed by the same factor so a piece looks like its slot.
- **Why a squash and not a real isometric view:** a true isometric map is rotated 45°, which puts north up-and-to-the-right and turns every direction answer sideways. Squashing keeps north up. The cost is that diagonals flatten a little: at 0.85, a northeast pair looks like about 50° instead of 45°, which is close enough to read correctly; at 0.62 it becomes ~58° and starts to fight the compass lesson, which is why 0.85 is the setting shipped.
- A fixed compass rose lives at (903, 494) — open ocean southeast of Florida in both the flat and tilted layouts, so it covers no state. It has `pointer-events: none`, and `MapView.badgeDir(k)` lights one of its arms orange.
- `Map: Tilted / Flat` on the home screen writes `settings.tilt`; `MapView.setTilt()` re-lays labels, stars, the viewBox and the compass.

### Why Which Way? draws no compass on the map (Sept 20, 2026)
The first version put a compass rose on the state being asked about. At map scale that rose is up to 96 units across, which buries Connecticut, Rhode Island, New Jersey and their neighbours. It is gone: the question's direction is now lit on the fixed corner compass instead, so the cue never sits on a state and children always read direction from the same place. `MapView.rose()` is still in the file, unused, if a big-state use ever turns up. The dashed arrow between the two states in an "A is ___ of B" question stays — it is a thin line and it is the question's mechanism. On those questions the corner compass stays neutral until the answer is given, since the direction *is* the answer.

### Typed answers: the Check button used to swallow the next one (fixed Sept 20, 2026)
Clicking **Check** with a mouse moves focus from the text box onto the button. Whatever the player typed next went nowhere — the box stayed empty — and pressing Enter then submitted an empty form, which the old code ignored in silence. It looked exactly like "I type a state and nothing happens", and it bit hardest in Which Way? and Neighbor Detective, where one question takes two or more typed answers. `bindAnswer()` now hands focus back to the box after every submit (unless the inputs have been locked), says "Type a state name in the box first" instead of ignoring an empty submit, and focuses a new question's box immediately rather than 60 ms later, which was long enough to eat the first letters. The input's `enterkeyhint` changed from `done` to `go`, since on a phone keyboard "done" only closes the keyboard while "go" submits.

## Map data
- Outlines: `us-atlas@3/states-albers-10m.json` (U.S. Census Bureau cartographic boundaries — public domain; package ISC license). Pre-projected Albers USA, 975×610, Alaska and Hawaii insets. Uploaded by Altezza because Claude's sandbox has no internet.
- Neighbors: the standard school list of land borders (Four Corners diagonal pairs like AZ–CO are NOT neighbors). Cross-checked against borders computed from the map topology: 0 differences.
- Capitals: all 50 with coordinates; each projected capital was verified to fall inside its state.
- State centres: area centroid per state, stored both as map coordinates and as real latitude/longitude (spot-checked against published state centres, e.g. Colorado 39.0 N / 105.5 W, Michigan 44.3 N / 85.4 W).
- Regions (5-region school scheme): Northeast 11 (ME NH VT MA RI CT NY NJ PA DE MD), Southeast 12 (WV VA KY TN NC SC GA FL AL MS AR LA), Midwest 12 (OH IN MI IL WI MN IA MO KS NE SD ND), Southwest 4 (TX OK NM AZ), West 11 (CO WY MT ID UT NV CA OR WA AK HI).
- Tiny states RI, CT, NJ, DE have tap boxes out in the Atlantic with leader lines; Hawaii has an enlarged tap area. DC is drawn but not playable.

## Look & feel
Road-trip theme built from U.S. highway signage: green guide signs for games, blue "rest area" sign for Explore, interstate shield for progress, white regulatory-sign answer buttons, yellow diamond for hints. Map: pastel atlas colors (5-color, no neighbors share a color) on a sea-blue ground with a coastline halo. Orange = mystery/target state, green = correct, red = wrong. Display font: DejaVu Sans Condensed Bold (free license), subset and embedded; body text uses the system font.

## Inside the HTML file
1. `<style>` — design tokens at the top of the CSS (colors `--l0…--l4`, `--sign`, `--target`…).
2. Body markup — header, home screen, game screen (map + side panel), results popup.
3. `<script>const MAP_DATA = {...}` — per state: `id, name, cap, reg, nb` (neighbors), `d` (SVG path), `bb` (bbox), `lp` (label point), `cp` (capital point), `r` (label room), `c` (color index), `co` (tap box, if any).
4. `<script>` game engine — `MapView` (map drawing/marking), `Drag`, `Sound`, `Voice`, `Confetti`, modes `Puzzle / Neighbors / NameIt / Where / Explore`, and the `App` shell. Tuning constants near the top: `QN = 10` questions, `NBN = 5` neighbor rounds, `HAND = 6` puzzle pieces.

## Testing done (Sept 11, 2026)
Headless Chromium with every network request blocked: 0 requests attempted, 0 console errors. Every direction question checked against an independent bearing calculation. Scripted play-through of every mode on Easy and Hard (including wrong answers, hints, reveal, misspellings, postal-code entry, "show me", drag misses, tap-to-place, and a full 50-piece Hard puzzle by drag). Layouts checked at 1366×768 laptop, 820×1180 tablet portrait, and 400 px phone (no sideways scrolling).

## Ideas for the next version
- Capitals quiz (capital data is already in the file).
- Optional deeper tilt for the puzzle only, where angles do not matter.
- Direction questions that use rivers, coasts or regions ("name a state on the west coast").
- Zoom button or pinch-zoom for the small Northeast states on tablets.
- Teacher options: round length, pick specific states, turn timer off.
- "Passport stamps" for each state a student has mastered.
- Fun facts / nicknames in Explore (needs a fact-checked list).
- Printable blank-map worksheet and answer key.

## Appendix: rebuilding the data
The session source was split into `src/style.css`, `src/body.html`, `src/app.js`, generated `src/data.js`, and `build/build.py` (inlines everything + base64 font into one file). The data generator (Python, no third-party packages) is below; run it next to `states-albers-10m.json`.

### build/topo.py
```python
"""Minimal TopoJSON decoder + helpers (no third-party deps)."""
import json, math

def load(path):
    d = json.load(open(path))
    sx, sy = d['transform']['scale']; tx, ty = d['transform']['translate']
    arcs = []
    for arc in d['arcs']:
        x = y = 0; pts = []
        for dx, dy in arc:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return d, arcs

def arc_pts(arcs, i):
    return arcs[i] if i >= 0 else arcs[~i][::-1]

def ring_pts(arcs, ring):
    out = []
    for k, i in enumerate(ring):
        p = arc_pts(arcs, i)
        out.extend(p if k == 0 else p[1:])
    return out

def polygons(geom):
    if geom['type'] == 'Polygon': return [geom['arcs']]
    if geom['type'] == 'MultiPolygon': return geom['arcs']
    return []

def area(r):
    a = 0
    for i in range(len(r) - 1):
        a += r[i][0] * r[i+1][1] - r[i+1][0] * r[i][1]
    return a / 2

def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def pip(pt, ring):
    x, y = pt; inside = False
    for i in range(len(ring) - 1):
        (x1, y1), (x2, y2) = ring[i], ring[i+1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside

def seg_dist2(px, py, a, b):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0: return (px-ax)**2 + (py-ay)**2
    t = max(0, min(1, ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)))
    return (px - ax - t*dx)**2 + (py - ay - t*dy)**2

def polylabel(rings, precision=0.5):
    """Pole of inaccessibility (Mapbox polylabel) for polygon [outer, holes...]."""
    import heapq
    minx, miny, maxx, maxy = bbox(rings[0])
    w, h = maxx - minx, maxy - miny
    cell = min(w, h)
    if cell == 0: return (minx, miny)
    def dist(x, y):
        inside = False; md = float('inf')
        for r in rings:
            for i in range(len(r) - 1):
                a, b = r[i], r[i+1]
                if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1]) + a[0]:
                    inside = not inside
                md = min(md, seg_dist2(x, y, a, b))
        return (1 if inside else -1) * math.sqrt(md)
    q = []; hsz = cell / 2
    def push(x, y, hh):
        d = dist(x, y); mx = d + hh * math.sqrt(2)
        heapq.heappush(q, (-mx, x, y, hh, d))
    x = minx
    while x < maxx:
        y = miny
        while y < maxy:
            push(x + hsz, y + hsz, hsz); y += cell
        x += cell
    # centroid seed
    best = (dist(minx + w/2, miny + h/2), minx + w/2, miny + h/2)
    while q:
        negmx, x, y, hh, d = heapq.heappop(q)
        if d > best[0]: best = (d, x, y)
        if -negmx - best[0] <= precision: continue
        hh /= 2
        for ox in (-hh, hh):
            for oy in (-hh, hh):
                push(x + ox, y + oy, hh)
    return best[1], best[2], best[0]
```

### build/build_data.py
```python
"""Build src/data.js from us-atlas states-albers-10m.json (pre-projected, 975x610)."""
import sys, json, math
sys.path.insert(0, 'build')
from topo import *

d, arcs = load('states-albers-10m.json')
geoms = d['objects']['states']['geometries']

INFO = {  # fips: (abbr, capital, cap_lat, cap_lon, region)
 '01':('AL','Montgomery',32.377,-86.300,'SE'), '02':('AK','Juneau',58.301,-134.420,'W'),
 '04':('AZ','Phoenix',33.448,-112.074,'SW'), '05':('AR','Little Rock',34.746,-92.290,'SE'),
 '06':('CA','Sacramento',38.576,-121.494,'W'), '08':('CO','Denver',39.739,-104.990,'W'),
 '09':('CT','Hartford',41.764,-72.682,'NE'), '10':('DE','Dover',39.158,-75.524,'NE'),
 '12':('FL','Tallahassee',30.438,-84.281,'SE'), '13':('GA','Atlanta',33.749,-84.388,'SE'),
 '15':('HI','Honolulu',21.307,-157.858,'W'), '16':('ID','Boise',43.615,-116.202,'W'),
 '17':('IL','Springfield',39.798,-89.654,'MW'), '18':('IN','Indianapolis',39.768,-86.158,'MW'),
 '19':('IA','Des Moines',41.587,-93.625,'MW'), '20':('KS','Topeka',39.048,-95.678,'MW'),
 '21':('KY','Frankfort',38.200,-84.873,'SE'), '22':('LA','Baton Rouge',30.451,-91.187,'SE'),
 '23':('ME','Augusta',44.311,-69.779,'NE'), '24':('MD','Annapolis',38.978,-76.492,'NE'),
 '25':('MA','Boston',42.360,-71.058,'NE'), '26':('MI','Lansing',42.733,-84.555,'MW'),
 '27':('MN','Saint Paul',44.954,-93.090,'MW'), '28':('MS','Jackson',32.299,-90.185,'SE'),
 '29':('MO','Jefferson City',38.577,-92.173,'MW'), '30':('MT','Helena',46.589,-112.039,'W'),
 '31':('NE','Lincoln',40.814,-96.702,'MW'), '32':('NV','Carson City',39.164,-119.767,'W'),
 '33':('NH','Concord',43.207,-71.538,'NE'), '34':('NJ','Trenton',40.221,-74.756,'NE'),
 '35':('NM','Santa Fe',35.687,-105.938,'SW'), '36':('NY','Albany',42.653,-73.757,'NE'),
 '37':('NC','Raleigh',35.780,-78.639,'SE'), '38':('ND','Bismarck',46.808,-100.784,'MW'),
 '39':('OH','Columbus',39.961,-82.999,'MW'), '40':('OK','Oklahoma City',35.468,-97.516,'SW'),
 '41':('OR','Salem',44.943,-123.035,'W'), '42':('PA','Harrisburg',40.264,-76.884,'NE'),
 '44':('RI','Providence',41.824,-71.413,'NE'), '45':('SC','Columbia',34.000,-81.035,'SE'),
 '46':('SD','Pierre',44.368,-100.351,'MW'), '47':('TN','Nashville',36.163,-86.781,'SE'),
 '48':('TX','Austin',30.267,-97.743,'SW'), '49':('UT','Salt Lake City',40.761,-111.891,'W'),
 '50':('VT','Montpelier',44.260,-72.576,'NE'), '51':('VA','Richmond',37.541,-77.436,'SE'),
 '53':('WA','Olympia',47.037,-122.901,'W'), '54':('WV','Charleston',38.350,-81.633,'SE'),
 '55':('WI','Madison',43.073,-89.401,'MW'), '56':('WY','Cheyenne',41.140,-104.820,'W'),
}

# Traditional land-border neighbors taught in school (Four Corners point-contacts excluded).
CURATED = {
 'AL':'FL GA MS TN','AK':'','AZ':'CA NV UT NM','AR':'MO TN MS LA TX OK','CA':'OR NV AZ',
 'CO':'WY NE KS OK NM UT','CT':'NY MA RI','DE':'MD PA NJ','FL':'AL GA','GA':'FL AL TN NC SC','HI':'',
 'ID':'WA OR NV UT WY MT','IL':'WI IA MO KY IN','IN':'IL MI OH KY','IA':'MN WI IL MO NE SD',
 'KS':'NE MO OK CO','KY':'IL IN OH WV VA TN MO','LA':'TX AR MS','ME':'NH','MD':'PA DE VA WV',
 'MA':'RI CT NY VT NH','MI':'WI IN OH','MN':'ND SD IA WI','MS':'LA AR TN AL',
 'MO':'IA IL KY TN AR OK KS NE','MT':'ID WY SD ND','NE':'SD IA MO KS CO WY','NV':'CA OR ID UT AZ',
 'NH':'ME MA VT','NJ':'NY PA DE','NM':'AZ CO OK TX','NY':'VT MA CT NJ PA','NC':'VA TN GA SC',
 'ND':'MN SD MT','OH':'PA WV KY IN MI','OK':'KS MO AR TX NM CO','OR':'WA ID NV CA',
 'PA':'NY NJ DE MD WV OH','RI':'CT MA','SC':'NC GA','SD':'ND MN IA NE WY MT',
 'TN':'KY VA NC GA AL MS AR MO','TX':'NM OK AR LA','UT':'ID WY CO AZ NV','VT':'NY NH MA',
 'VA':'MD WV KY TN NC','WA':'ID OR','WV':'OH PA MD VA KY','WI':'MI MN IA IL','WY':'MT SD NE CO UT ID',
}

# --- d3.geoAlbersUsa().scale(1300).translate([487.5,305]) for capital markers ---
def conic_raw(y0, y1):
    sy0 = math.sin(y0); n = (sy0 + math.sin(y1)) / 2
    c = 1 + sy0 * (2*n - sy0); r0 = math.sqrt(c) / n
    def f(x, y):
        r = math.sqrt(c - 2*n*math.sin(y)) / n; x *= n
        return r*math.sin(x), r0 - r*math.cos(x)
    return f
def make_proj(rot, center, par, k, tr):
    raw = conic_raw(math.radians(par[0]), math.radians(par[1]))
    cx, cy = raw(math.radians(center[0]), math.radians(center[1]))
    dx, dy = tr[0] - k*cx, tr[1] + k*cy
    def p(lon, lat):
        lam = ((lon + rot + 180) % 360) - 180
        x, y = raw(math.radians(lam), math.radians(lat))
        return dx + k*x, dy - k*y
    return p
K, TX, TY = 1300, 487.5, 305
P48 = make_proj(96, (-0.6, 38.7), (29.5, 45.5), K, (TX, TY))
PAK = make_proj(154, (-2, 58.5), (55, 65), K*0.35, (TX - 0.307*K, TY + 0.201*K))
PHI = make_proj(157, (-3, 19.9), (8, 18), K, (TX - 0.205*K, TY + 0.212*K))
def albers_usa(lon, lat, abbr):
    return (PAK if abbr == 'AK' else PHI if abbr == 'HI' else P48)(lon, lat)

def fmt(v): 
    s = f'{v:.1f}'
    s = s.rstrip('0').rstrip('.') if '.' in s else s
    return '0' if s in ('-0', '') else s

def ring_to_rel(r):
    # relative path: M x y l dx dy ... z, rounded to 0.1 with error accumulation avoided
    q = [(round(x*10), round(y*10)) for x, y in r]
    out = [f'M{fmt(q[0][0]/10)} {fmt(q[0][1]/10)}']
    parts = []; px, py = q[0]
    for x, y in q[1:-1]:
        if (x, y) == (px, py): continue
        parts.append(f'{fmt((x-px)/10)} {fmt((y-py)/10)}'.replace(' -', '-'))
        px, py = x, y
    return out[0] + 'l' + ' '.join(parts).replace(' -', '-') + 'z'

fips2abbr = {k: v[0] for k, v in INFO.items()}
arcs_of = {}
states = []
for g in geoms:
    fid = g['id']; name = g['properties']['name']
    polys = polygons(g)
    used = set()
    for p in polys:
        for ring in p:
            for i in ring: used.add(i if i >= 0 else ~i)
    arcs_of[fid] = used
    rings_kept = []; kept_polys = []
    for p in polys:
        outer = ring_pts(arcs, p[0]); a = abs(area(outer)); b = bbox(outer)
        ext = max(b[2]-b[0], b[3]-b[1])
        if fid not in ('15', '44') and a < 0.6 and ext < 2.0: continue
        if b[2] < 2: continue  # Aleutian specks west of the frame
        rr = [ring_pts(arcs, r) for r in p]
        kept_polys.append((a, rr))
    kept_polys.sort(key=lambda t: -t[0])
    path = ''.join(ring_to_rel(r) for _, rr in kept_polys for r in rr)
    allpts = [pt for _, rr in kept_polys for pt in rr[0]]
    bx = bbox(allpts)
    lx, ly, lr = polylabel(kept_polys[0][1], 0.3)
    states.append(dict(fips=fid, name=name, path=path, bbox=bx, label=(lx, ly), r=lr,
                       area=sum(a for a, _ in kept_polys), polys=kept_polys))

# neighbors from shared arcs
byfips = {s['fips']: s for s in states}
computed = {}
for s in states:
    if s['fips'] == '11': continue
    ab = fips2abbr[s['fips']]
    computed[ab] = sorted(fips2abbr[t['fips']] for t in states
                          if t is not s and t['fips'] != '11' and arcs_of[s['fips']] & arcs_of[t['fips']])
print('Neighbor check (computed shared-border vs curated school list):')
diffs = 0
for ab in sorted(CURATED):
    cur = set(CURATED[ab].split()); com = set(computed[ab])
    if cur != com:
        diffs += 1
        print(f'  {ab}: only-curated={sorted(cur-com)} only-computed={sorted(com-cur)}')
# symmetry
for ab, ns in CURATED.items():
    for n in ns.split():
        assert ab in CURATED[n].split(), f'asymmetric {ab}-{n}'
print('  differences:', diffs, '| curated list symmetric: OK')

# capitals: project + verify inside state
out = []
for s in states:
    if s['fips'] == '11':
        dc = s; continue
    ab, cap, clat, clon, reg = INFO[s['fips']]
    cx, cy = albers_usa(clon, clat, ab)
    inside = any(pip((cx, cy), rr[0]) for _, rr in s['polys'])
    if not inside: print('  CAPITAL OUTSIDE STATE:', ab, cap, round(cx,1), round(cy,1))
    b = s['bbox']
    out.append(dict(id=ab, name=s['name'], cap=cap, reg=reg,
        nb=CURATED[ab].split(), d=s['path'],
        bb=[round(b[0],1), round(b[1],1), round(b[2]-b[0],1), round(b[3]-b[1],1)],
        lp=[round(s['label'][0],1), round(s['label'][1],1)],
        cp=[round(cx,1), round(cy,1)], r=round(s['r'],1), ar=round(s['area']), polys=s['polys']))
out.sort(key=lambda s: s['name'])
# --- callout boxes for tiny states (tap targets in the Atlantic) ---
CALLOUTS = [('RI', 196), ('CT', 214), ('NJ', 236), ('DE', 258)]
BX, BW, BH = 936, 26, 16
byid = {s['id']: s for s in out}
for ab, cy in CALLOUTS:
    s = byid[ab]; ax, ay = BX, cy
    best = None
    x0, y0, w, h = s['bb']
    rings = [rr for _, rr in s['polys']]
    import math
    gx = x0
    while gx <= x0 + w:
        gy = y0
        while gy <= y0 + h:
            for rr in rings:
                if pip((gx, gy), rr[0]):
                    md = min(seg_dist2(gx, gy, rr[0][i], rr[0][i+1]) for i in range(len(rr[0]) - 1))
                    if md >= 1.2**2:
                        dd = (gx-ax)**2 + (gy-ay)**2
                        if best is None or dd < best[0]: best = (dd, gx, gy)
            gy += 0.5
        gx += 0.5
    s['co'] = [BX, cy - BH/2, BW, BH, round(best[1],1), round(best[2],1)]
# --- 5-colour map colouring (no two neighbours share a colour), balanced ---
order = sorted(out, key=lambda s: (-len(s['nb']), s['id']))
col = {}; used = [0]*5
for s in order:
    taken = {col[n] for n in s['nb'] if n in col}
    free = [c for c in range(5) if c not in taken]
    c = min(free, key=lambda c: (used[c], c)); col[s['id']] = c; used[c] += 1
for s in out:
    s['c'] = col[s['id']]
    assert all(col[n] != s['c'] for n in s['nb'])
    del s['polys']
print('colour use:', used)
fc = P48(-109.045, 36.999)
print('Four Corners projected:', [round(v,1) for v in fc])
data = {'states': out, 'dc': {'d': dc['path'], 'lp': [round(v,1) for v in dc['label']]}}
js = 'const MAP_DATA = ' + json.dumps(data, separators=(',', ':')) + ';\n'
open('src/data.js', 'w').write(js)
print('src/data.js bytes:', len(js), '| states:', len(out))
```
