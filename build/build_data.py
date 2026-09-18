"""Build src/data.js from us-atlas states-albers-10m.json (pre-projected, 975x610)."""
import sys, json, math
sys.path.insert(0, 'build')
from topo import *

d, arcs = load('data/states-albers-10m.json')
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
def make_inv(rot, center, par, k, tr):
    y0, y1 = math.radians(par[0]), math.radians(par[1])
    sy0 = math.sin(y0); n = (sy0 + math.sin(y1)) / 2
    c = 1 + sy0 * (2*n - sy0); r0 = math.sqrt(c) / n
    raw = conic_raw(y0, y1)
    cx, cy = raw(math.radians(center[0]), math.radians(center[1]))
    dx, dy = tr[0] - k*cx, tr[1] + k*cy
    def inv(px, py):
        x = (px - dx) / k; y = (dy - py) / k
        yp = r0 - y; r = math.hypot(x, yp)
        lam = math.atan2(x, yp) / n
        phi = math.asin((c - r*r*n*n) / (2*n))
        lon = math.degrees(lam) - rot
        return round(math.degrees(phi), 3), round(((lon + 180) % 360) - 180, 3)
    return inv

K, TX, TY = 1300, 487.5, 305
P48 = make_proj(96, (-0.6, 38.7), (29.5, 45.5), K, (TX, TY))
PAK = make_proj(154, (-2, 58.5), (55, 65), K*0.35, (TX - 0.307*K, TY + 0.201*K))
PHI = make_proj(157, (-3, 19.9), (8, 18), K, (TX - 0.205*K, TY + 0.212*K))
I48 = make_inv(96, (-0.6, 38.7), (29.5, 45.5), K, (TX, TY))
IAK = make_inv(154, (-2, 58.5), (55, 65), K*0.35, (TX - 0.307*K, TY + 0.201*K))
IHI = make_inv(157, (-3, 19.9), (8, 18), K, (TX - 0.205*K, TY + 0.212*K))
def inv_albers(x, y, abbr):
    return (IAK if abbr == 'AK' else IHI if abbr == 'HI' else I48)(x, y)

def ring_centroid(r):
    a = cx = cy = 0.0
    for i in range(len(r) - 1):
        cross = r[i][0]*r[i+1][1] - r[i+1][0]*r[i][1]
        a += cross
        cx += (r[i][0] + r[i+1][0]) * cross
        cy += (r[i][1] + r[i+1][1]) * cross
    if a == 0: return r[0][0], r[0][1], 0.0
    return cx / (3*a), cy / (3*a), abs(a / 2)

def state_centroid(polys):
    sx = sy = sa = 0.0
    for _, rings in polys:
        cx, cy, a = ring_centroid(rings[0])
        sx += cx*a; sy += cy*a; sa += a
    return sx/sa, sy/sa

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
        cp=[round(cx,1), round(cy,1)], r=round(s['r'],1), ar=round(s['area']), polys=s['polys'],
        ct=[round(v,1) for v in state_centroid(s['polys'])],
        ll=list(inv_albers(*state_centroid(s['polys']), ab))))
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
