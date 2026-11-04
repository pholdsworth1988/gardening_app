import type { Aspect, Feature, Furniture, Garden, Point } from './types';

// Stand-in for the AI step. It returns the sample back-garden layout scaled to the
// size the user entered. The real version sends the sketch photo to the Claude API
// (see prototype/sketch-to-plan/sketch_to_layout.py) and returns the same shape.

const rect = (x: number, y: number, w: number, h: number): Point[] => [
  { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
];

export const centroid = (pts: Point[]): Point => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

const feature = (id: string, kind: Feature['kind'], label: string, points: Point[], material = ''): Feature => ({
  id, kind, label, shape: 'polygon', points, center: centroid(points), radius_m: 0, material,
});

// Smooth closed curve through control points (Catmull-Rom), sampled into a polygon.
// Curves are stored as many-cornered polygons, so the editor and drawing need no special case.
function smooth(ctrl: [number, number][], closed = true, per = 10): Point[] {
  const n = ctrl.length;
  const at = (i: number) => ctrl[closed ? (i + n) % n : Math.min(Math.max(i, 0), n - 1)];
  const out: Point[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  if (!closed) out.push({ x: ctrl[n - 1][0], y: ctrl[n - 1][1] });
  return out;
}

const circle = (cx: number, cy: number, r: number, n = 40): Point[] =>
  Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos((i / n) * Math.PI * 2) * r, y: cy + Math.sin((i / n) * Math.PI * 2) * r }));

// The sample is designed on an 8 x 12 m plot, then stretched to the size the user enters.
const W0 = 8, D0 = 12;
const unit = (pts: Point[]) => pts.map((p) => ({ x: p.x / W0, y: p.y / D0 }));

// A sweeping lawn, a patio with a curved edge, and a stepping-stone path that wanders
// up to a round gravel seating area under the tree. Borders fill everything else.
const LAWN: [number, number][] = [
  [2.3, 4.4], [3.6, 3.9], [5.0, 4.1], [6.3, 4.6], [6.6, 5.9], [5.9, 7.0], [6.1, 8.0],
  [5.0, 8.6], [3.6, 8.4], [2.3, 8.1], [1.7, 7.0], [2.1, 5.9], [1.8, 5.0],
];
const PATIO_EDGE: [number, number][] = [[0, 9.7], [1.8, 9.15], [4.2, 9.35], [6.4, 8.95], [8, 9.5]];
const STONES: [number, number][] = [[4.6, 9.1], [4.9, 7.8], [4.4, 6.4], [3.8, 5.0], [3.7, 3.7]];

const UNIT_FEATURES: Feature[] = [
  feature('F2', 'bed', '', unit(rect(0, 0, W0, 10.2))),
  feature('F7', 'raised_bed', 'Veg beds', unit(rect(0.35, 0.35, 2.4, 1.1))),
  feature('F6', 'shed', 'Shed', unit(rect(5.9, 0.3, 1.8, 1.7))),
  feature('F9', 'path', 'Gravel seating', unit(circle(3.6, 2.45, 1.25)), 'gravel'),
  feature('F1', 'lawn', 'Lawn', unit(smooth(LAWN))),
  feature('F5', 'patio', 'Patio', unit([...smooth(PATIO_EDGE, false), { x: W0, y: D0 }, { x: 0, y: D0 }]), 'sandstone'),
  feature('F4', 'path', '', unit(smooth(STONES, false, 6)), 'stepping_stones'),
];

// Plants in loose drifts along the lawn edge, taller at the back and sides.
const PLANT_SPOTS: { plantId: string; x: number; y: number; quantity: number }[] = [
  { plantId: 'acer', x: 1.25, y: 3.2, quantity: 1 },
  { plantId: 'fern', x: 0.55, y: 2.15, quantity: 3 },
  { plantId: 'hosta', x: 0.6, y: 4.55, quantity: 2 },
  { plantId: 'geranium', x: 0.85, y: 5.9, quantity: 5 },
  { plantId: 'grass', x: 0.95, y: 7.55, quantity: 7 },
  { plantId: 'lavender', x: 2.5, y: 8.75, quantity: 7 },
  { plantId: 'geranium', x: 4.35, y: 0.7, quantity: 5 },
  { plantId: 'salvia', x: 5.45, y: 2.75, quantity: 5 },
  { plantId: 'hydrangea', x: 7.05, y: 3.0, quantity: 1 },
  { plantId: 'hosta', x: 6.05, y: 3.65, quantity: 1 },
  { plantId: 'rose', x: 7.45, y: 4.75, quantity: 1 },
  { plantId: 'catmint', x: 7.05, y: 6.3, quantity: 6 },
  { plantId: 'grass', x: 6.75, y: 7.55, quantity: 4 },
  { plantId: 'rosemary', x: 7.4, y: 8.2, quantity: 1 },
  { plantId: 'thyme', x: 5.9, y: 8.65, quantity: 5 },
];

// Seating on the patio and in the gravel circle. Positions are fractions; sizes are real furniture sizes.
const FURNITURE_SPOTS: (Omit<Furniture, 'x' | 'y'> & { u: number; v: number })[] = [
  { id: 'S1', kind: 'dining_set', u: 2.3 / W0, v: 10.75 / D0, rotDeg: 0, seats: 6 },
  { id: 'S2', kind: 'lounger', u: 5.9 / W0, v: 10.85 / D0, rotDeg: -8, seats: 0 },
  { id: 'S3', kind: 'lounger', u: 6.9 / W0, v: 10.85 / D0, rotDeg: -8, seats: 0 },
  { id: 'S4', kind: 'pot', u: 0.45 / W0, v: 10.2 / D0, rotDeg: 0, seats: 0 },
  { id: 'S5', kind: 'pot', u: 7.55 / W0, v: 10.0 / D0, rotDeg: 0, seats: 0 },
  { id: 'S6', kind: 'bistro_set', u: 3.6 / W0, v: 2.45 / D0, rotDeg: 0, seats: 3 },
];

export function makeLayoutFromSketch(opts: {
  id: string; title: string; widthM: number; depthM: number; aspect: Aspect; sketchUri: string | null;
}): Garden {
  const { widthM: w, depthM: d } = opts;
  const scalePts = (pts: Point[]) => pts.map((p) => ({ x: round(p.x * w), y: round(p.y * d) }));
  const features = UNIT_FEATURES.map((f) => {
    const points = scalePts(f.points);
    return { ...f, points, center: centroid(points) };
  });
  const plants = PLANT_SPOTS.map((s, i) => ({
    id: `P${i + 1}`, plantId: s.plantId, x: round((s.x / W0) * w), y: round((s.y / D0) * d), quantity: s.quantity, featureId: 'F2',
  }));
  const furniture = FURNITURE_SPOTS.map(({ u, v, ...f }) => ({ ...f, x: round(u * w), y: round(v * d) }));
  return {
    id: opts.id,
    title: opts.title,
    createdAt: new Date().toISOString(),
    widthM: w,
    depthM: d,
    northDeg: { North: 0, East: 90, South: 180, West: 270 }[opts.aspect],
    aspect: opts.aspect,
    sketchUri: opts.sketchUri,
    features,
    plants,
    furniture,
    assumptions: [
      `Garden size taken from what you entered: ${w} m by ${d} m.`,
      'Sample layout: in the full app this comes from reading your sketch.',
      'Border plants suggested because the beds were left unplanted.',
      'Dining set for six and two loungers suggested for the patio, with a bistro set in a gravel circle under the maple.',
      'Curved lawn and borders suggested to give the garden a natural flow.',
    ],
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

export const SAMPLE_GARDEN: Garden = makeLayoutFromSketch({
  id: 'sample', title: 'Back garden', widthM: 8, depthM: 12, aspect: 'North', sketchUri: null,
});
