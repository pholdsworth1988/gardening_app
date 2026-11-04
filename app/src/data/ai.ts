// Sends a sketch photo to the Hedge sketch server, which asks Claude to read it, and turns the
// reply into a Garden the app can draw and edit. The API key lives on the server, never in the app.
// Server: prototype/sketch-to-plan/server.py. Set EXPO_PUBLIC_HEDGE_API_URL to use it.

import { PLANTS, type PlantInfo } from './plants';
import { centroid } from './sample';
import type { Aspect, Feature, FeatureKind, Furniture, FurnitureKind, Garden, PlacedPlant, Point } from './types';

export const API_URL = process.env.EXPO_PUBLIC_HEDGE_API_URL ?? '';

// The layout as the server returns it (prototype/sketch-to-plan/layout.py).
type AiPoint = { x: number; y: number };
type AiLayout = {
  title: string; width_m: number; depth_m: number; north_deg: number;
  features: { id: string; kind: string; label: string; shape: 'polygon' | 'circle'; points: AiPoint[]; center: AiPoint; radius_m: number; material: string }[];
  plants: { id: string; common_name: string; latin_name: string; plant_type?: PlantInfo['type']; x: number; y: number; spread_m: number; height_m?: number; quantity: number; feature_id: string }[];
  furniture?: { id: string; kind: string; x: number; y: number; rotation_deg: number; seats: number }[];
  assumptions: string[];
};

const FEATURE_KINDS: FeatureKind[] = ['lawn', 'bed', 'raised_bed', 'path', 'patio', 'decking', 'pond', 'shed', 'greenhouse', 'fence', 'hedge', 'wall', 'water_butt', 'compost', 'seating', 'house', 'other'];
const FURNITURE_KINDS: FurnitureKind[] = ['dining_set', 'bistro_set', 'bench', 'lounger', 'sofa', 'fire_pit', 'pot'];

export async function readSketch(opts: {
  base64: string; mediaType: string; widthM: number; depthM: number; notes?: string;
}): Promise<AiLayout> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180_000); // reading a sketch with thinking can take a minute or two
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}/layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: opts.base64, media_type: opts.mediaType, width_m: opts.widthM, depth_m: opts.depthM, notes: opts.notes ?? '' }),
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? `The sketch server replied with error ${res.status}.`);
    return body as AiLayout;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Reading the sketch took too long. Try again.');
    if (e instanceof TypeError) throw new Error("Couldn't reach the sketch server. Check it is running and on the same network.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const norm = (t: string) => t.toLowerCase().replace(/['’"]/g, '').replace(/\s+/g, ' ').trim();

/** Finds the plant in the library, or adds it, so every AI plant has details and a symbol. */
function plantFor(p: AiLayout['plants'][number]): PlantInfo {
  const latin = norm(p.latin_name), common = norm(p.common_name);
  const hit =
    PLANTS.find((x) => norm(x.latinName) === latin) ??
    PLANTS.find((x) => norm(x.commonName) === common) ??
    PLANTS.find((x) => latin.length > 3 && (norm(x.latinName).startsWith(latin) || latin.startsWith(norm(x.latinName))));
  if (hit) return hit;
  // Not in the starter library yet: add it with what Claude told us, so it still draws and lists.
  const info: PlantInfo = {
    id: `ai-${(latin || common).replace(/[^a-z0-9]+/g, '-')}`,
    commonName: p.common_name, latinName: p.latin_name,
    type: p.plant_type ?? (p.spread_m >= 2.5 ? 'Tree' : 'Perennial'),
    spreadM: Math.max(0.2, p.spread_m), heightM: p.height_m ?? 0.6,
    sun: ['Full sun', 'Part shade'], water: 'Medium', spacingM: Math.max(0.2, p.spread_m * 0.75),
    flowering: '', note: 'Suggested from your sketch. Full care details come with the plant database.',
    colour: '#7a9a6a',
  };
  if (!PLANTS.some((x) => x.id === info.id)) PLANTS.push(info);
  return PLANTS.find((x) => x.id === info.id)!;
}

const circle = (c: Point, r: number, n = 40): Point[] =>
  Array.from({ length: n }, (_, i) => ({ x: c.x + Math.cos((i / n) * Math.PI * 2) * r, y: c.y + Math.sin((i / n) * Math.PI * 2) * r }));

const clampPt = (p: Point, w: number, d: number) => ({ x: Math.min(w, Math.max(0, p.x)), y: Math.min(d, Math.max(0, p.y)) });

/** Turns Claude's layout into a Garden. Sizes the user typed win over any Claude read. */
export function layoutToGarden(l: AiLayout, opts: { id: string; title: string; widthM: number; depthM: number; aspect: Aspect; sketchUri: string | null }): Garden {
  const w = opts.widthM, d = opts.depthM;
  // If Claude measured a different overall size, stretch its layout to the size the user gave.
  const sx = l.width_m > 0 ? w / l.width_m : 1, sy = l.depth_m > 0 ? d / l.depth_m : 1;
  const fit = (p: AiPoint) => clampPt({ x: p.x * sx, y: p.y * sy }, w, d);

  const features: Feature[] = l.features
    .filter((f) => f.shape === 'circle' ? f.radius_m > 0 : f.points.length >= (f.material === 'stepping_stones' || f.kind === 'fence' || f.kind === 'wall' ? 2 : 3))
    .map((f) => {
      // Circles become many-sided polygons so they get the same textures and editing as other shapes.
      const points = f.shape === 'circle' ? circle(fit(f.center), f.radius_m * Math.min(sx, sy)).map((p) => clampPt(p, w, d)) : f.points.map(fit);
      const kind = (FEATURE_KINDS as string[]).includes(f.kind) ? (f.kind as FeatureKind) : 'other';
      return { id: f.id, kind, label: f.label, shape: 'polygon', points, center: centroid(points), radius_m: 0, material: f.material };
    });

  const plants: PlacedPlant[] = l.plants.map((p) => {
    const info = plantFor(p);
    const at = fit(p);
    return { id: p.id, plantId: info.id, x: at.x, y: at.y, quantity: Math.max(1, Math.round(p.quantity)), featureId: p.feature_id };
  });

  const furniture: Furniture[] = (l.furniture ?? [])
    .filter((f) => (FURNITURE_KINDS as string[]).includes(f.kind))
    .map((f) => ({ id: f.id, kind: f.kind as FurnitureKind, ...fit(f), rotDeg: f.rotation_deg || 0, seats: f.seats || 0 }));

  const assumptions = [...l.assumptions];
  if (Math.abs(sx - 1) > 0.05 || Math.abs(sy - 1) > 0.05) {
    assumptions.push(`The sketch read as ${l.width_m} m by ${l.depth_m} m, so it was fitted to the ${w} m by ${d} m you entered.`);
  }

  return {
    id: opts.id, title: opts.title || l.title, createdAt: new Date().toISOString(),
    widthM: w, depthM: d, northDeg: { North: 0, East: 90, South: 180, West: 270 }[opts.aspect], aspect: opts.aspect,
    sketchUri: opts.sketchUri, features, plants, furniture, assumptions,
  };
}
