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
