import type { Aspect, Feature, Garden, Point } from './types';

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

// Layout on a unit square (fractions of width and depth).
const UNIT_FEATURES: Feature[] = [
  feature('F7', 'raised_bed', 'Veg beds', rect(0.04, 0.03, 0.45, 0.13)),
  feature('F6', 'shed', 'Shed', rect(0.68, 0.025, 0.3, 0.15)),
  feature('F8', 'path', 'Bark path', rect(0, 0.185, 1, 0.065), 'bark'),
  feature('F2', 'bed', 'Border', rect(0, 0.25, 0.275, 0.5)),
  feature('F1', 'lawn', 'Lawn', rect(0.275, 0.25, 0.575, 0.433)),
  feature('F3', 'bed', 'Border', rect(0.85, 0.25, 0.15, 0.5)),
  feature('F4', 'path', 'Gravel path', rect(0.275, 0.683, 0.575, 0.067), 'gravel'),
  feature('F5', 'patio', 'Patio', rect(0, 0.75, 1, 0.25), 'sandstone'),
];

const PLANT_SPOTS: { plantId: string; u: number; v: number; quantity: number; featureId: string }[] = [
  { plantId: 'acer', u: 0.14, v: 0.35, quantity: 1, featureId: 'F2' },
  { plantId: 'lavender', u: 0.14, v: 0.53, quantity: 5, featureId: 'F2' },
  { plantId: 'geranium', u: 0.17, v: 0.66, quantity: 3, featureId: 'F2' },
  { plantId: 'rose', u: 0.925, v: 0.33, quantity: 1, featureId: 'F3' },
  { plantId: 'catmint', u: 0.925, v: 0.5, quantity: 4, featureId: 'F3' },
  { plantId: 'rosemary', u: 0.925, v: 0.66, quantity: 1, featureId: 'F3' },
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
    id: `P${i + 1}`, plantId: s.plantId, x: round(s.u * w), y: round(s.v * d), quantity: s.quantity, featureId: s.featureId,
  }));
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
    assumptions: [
      `Garden size taken from what you entered: ${w} m by ${d} m.`,
      'Sample layout: in the full app this comes from reading your sketch.',
      'Border plants suggested because the beds were left unplanted.',
    ],
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

export const SAMPLE_GARDEN: Garden = makeLayoutFromSketch({
  id: 'sample', title: 'Back garden', widthM: 8, depthM: 12, aspect: 'North', sketchUri: null,
});
