// Drawing style for the technical plan: plant symbols, shadows and surface textures.
// Everything is drawn in code from the layout, so it scales to each plant's real size
// and stays editable. All randomness is seeded from ids, so a plan always looks the same.

import { Fragment, type ReactElement } from 'react';
import { Circle, ClipPath, Defs, G, Line, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { PLANTS, type PlantInfo } from '@/data/plants';
import type { Feature, Furniture } from '@/data/types';

type Px = (m: number) => number;

// Refined, computer-drawn palette: calm greens, warm neutrals, crisp ink.
export const PALETTE = {
  paper: '#ffffff',
  ink: '#1f2622',
  shadow: 'rgba(36, 48, 34, 0.14)',
  lawn: '#d9e7bf', lawnStripe: '#d1e1b3',
  soil: '#f1e9dc', soilDot: '#d6c8ae',
  stone: ['#efeeea', '#e9e7e2', '#f3f2ef'], joint: '#c9c5bb',
  gravel: '#f3f0e9', gravelDot: ['#cdc5b4', '#bab29f', '#ded8c9'],
  bark: '#dfcaab', barkFleck: '#ad9070',
  timber: '#9a7b55', deck: '#e6d5b8', deckLine: '#b89b74',
  roof: '#ebe9e4', roofLine: '#c4c0b7',
  water: '#c9e3ec', ripple: '#93bccb',
  // Plant gradients: light centre (sun from top left) to a deeper edge.
  treeHi: '#d3e6ad', tree: '#9fc275', treeEdge: '#76a052', treeLine: '#4d6d3a',
  shrubHi: '#c4dd98', shrub: '#8fb867', shrubEdge: '#6c9a4c',
  foliageHi: '#d0e5ac', foliage: '#a6c97f', foliageEdge: '#83ad62',
  grass: '#b5a66c',
};

// Each plant gets its own foliage tone and leaf texture, so the planting reads at a glance.
type Texture = 'leafy' | 'fine' | 'needle' | 'frond' | 'none';
const TONES: Record<string, { hi: string; mid: string; edge: string; line: string; tex: Texture }> = {
  acer: { hi: '#e9b3a2', mid: '#bf6a55', edge: '#924236', line: '#6a2e26', tex: 'none' },
  lavender: { hi: '#e4e8d6', mid: '#b7c0a2', edge: '#909c7c', line: '#66725a', tex: 'fine' },
  geranium: { hi: '#d4e6ae', mid: '#9cc072', edge: '#759d52', line: '#4f6f3a', tex: 'leafy' },
  rose: { hi: '#cfe1a8', mid: '#8bb262', edge: '#628d45', line: '#456a33', tex: 'leafy' },
  catmint: { hi: '#e0e7cc', mid: '#afbf92', edge: '#899b70', line: '#617050', tex: 'fine' },
  rosemary: { hi: '#cfe0cf', mid: '#8eaa91', edge: '#63846b', line: '#46624d', tex: 'needle' },
  hosta: { hi: '#e7f1b0', mid: '#bdd474', edge: '#94b24c', line: '#68832f', tex: 'leafy' },
  fern: { hi: '#bfd9a0', mid: '#74a056', edge: '#4f7a3c', line: '#3a5c2b', tex: 'frond' },
  salvia: { hi: '#d3e3b6', mid: '#98b67e', edge: '#73935b', line: '#506d40', tex: 'needle' },
  hydrangea: { hi: '#cde2a4', mid: '#8fb664', edge: '#6b9548', line: '#4b6f34', tex: 'leafy' },
  thyme: { hi: '#dbe5c2', mid: '#a9bc8d', edge: '#83996a', line: '#5f7350', tex: 'fine' },
};
const toneFor = (info: PlantInfo) =>
  TONES[info.id] ?? (info.type === 'Tree'
    ? { hi: PALETTE.treeHi, mid: PALETTE.tree, edge: PALETTE.treeEdge, line: PALETTE.treeLine, tex: 'none' as Texture }
    : { hi: PALETTE.shrubHi, mid: PALETTE.shrub, edge: PALETTE.shrubEdge, line: PALETTE.treeLine, tex: 'leafy' as Texture });

// Shadows fall towards the bottom right, as if the sun were top left of the sheet.
const SUN = { x: 0.8, y: 0.6 };

// ---------- seeded randomness ----------

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- shapes ----------

/** A soft, scalloped outline like a hand-drawn canopy. */
export function scallop(cx: number, cy: number, r: number, bumps: number, seed: string, depth = 0.14) {
  const rand = rng(seed);
  const pts = Array.from({ length: bumps }, (_, i) => {
    const a = (i / bumps) * Math.PI * 2 + rand() * 0.15;
    const rr = r * (1 - depth / 2 + (rand() - 0.5) * depth * 0.6);
    return { a, rr };
  });
  let d = '';
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % bumps];
    const a2 = i === bumps - 1 ? q.a + Math.PI * 2 : q.a;
    const mid = (p.a + a2) / 2;
    const cr = Math.max(p.rr, q.rr) * (1 + depth);
    const [x1, y1] = [cx + p.rr * Math.cos(p.a), cy + p.rr * Math.sin(p.a)];
    const [x2, y2] = [cx + q.rr * Math.cos(q.a), cy + q.rr * Math.sin(q.a)];
    if (i === 0) d += `M${x1.toFixed(1)} ${y1.toFixed(1)}`;
    d += ` Q${(cx + cr * Math.cos(mid)).toFixed(1)} ${(cy + cr * Math.sin(mid)).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  });
  return d + ' Z';
}

const shadowOffset = (heightM: number, scale: number) => {
  const m = Math.min(Math.max(heightM * 0.16, 0.06), 0.55) * scale;
  return { dx: SUN.x * m, dy: SUN.y * m };
};

// ---------- plant symbols ----------

/** Shared gradients for one drawing. Ids are prefixed so several drawings can share a screen. */
export function PlanDefs({ prefix }: { prefix: string }) {
  const grad = (id: string, hi: string, mid: string, edge: string) => (
    <RadialGradient id={`${prefix}-${id}`} cx="50%" cy="50%" r="50%" fx="36%" fy="34%">
      <Stop offset="0" stopColor={hi} />
      <Stop offset="0.62" stopColor={mid} />
      <Stop offset="1" stopColor={edge} />
    </RadialGradient>
  );
  return (
    <Defs>
      {grad('tree', PALETTE.treeHi, PALETTE.tree, PALETTE.treeEdge)}
      {grad('shrub', PALETTE.shrubHi, PALETTE.shrub, PALETTE.shrubEdge)}
      {grad('foliage', PALETTE.foliageHi, PALETTE.foliage, PALETTE.foliageEdge)}
      {PLANTS.map((p) => { const t = toneFor(p); return <Fragment key={p.id}>{grad(`p-${p.id}`, t.hi, t.mid, t.edge)}</Fragment>; })}
    </Defs>
  );
}

/** A soft shadow made of two offset layers, so its edge fades rather than stops. */
function SoftShadow({ cx, cy, r, dx, dy }: { cx: number; cy: number; r: number; dx: number; dy: number }) {
  return (
    <G>
      <Circle cx={cx + dx} cy={cy + dy} r={r * 1.04} fill={PALETTE.shadow} opacity={0.55} />
      <Circle cx={cx + dx * 0.8} cy={cy + dy * 0.8} r={r * 0.96} fill={PALETTE.shadow} />
    </G>
  );
}

export function PlantSymbol({ info, id, cx, cy, quantity, scale, selected, gradPrefix }: {
  info: PlantInfo; id: string; cx: number; cy: number; quantity: number; scale: number; selected: boolean; gradPrefix: string;
}) {
  const r = Math.max((info.spreadM / 2) * scale, 4);
  const sh = shadowOffset(info.heightM, scale);
  const g = (name: string) => `url(#${gradPrefix}-${name})`;
  const tone = toneFor(info);
  const ring = selected ? <Circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#2f5d3a" strokeWidth={2} strokeDasharray="4 3" /> : null;

  if (info.type === 'Tree') {
    const spokes = 10;
    return (
      <G>
        <SoftShadow cx={cx} cy={cy} r={r} dx={sh.dx} dy={sh.dy} />
        <Path d={scallop(cx, cy, r, Math.round(14 + r / 5), id, 0.05)} fill={g(`p-${info.id}`)} stroke={tone.line} strokeWidth={0.7} />
        <Circle cx={cx} cy={cy} r={r * 0.64} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={0.6} />
        {Array.from({ length: spokes }, (_, k) => {
          const a = (k / spokes) * Math.PI * 2;
          return <Line key={k} x1={cx + Math.cos(a) * r * 0.1} y1={cy + Math.sin(a) * r * 0.1} x2={cx + Math.cos(a) * r * 0.9} y2={cy + Math.sin(a) * r * 0.9} stroke={tone.line} strokeOpacity={0.35} strokeWidth={0.45} />;
        })}
        <Circle cx={cx} cy={cy} r={Math.max(1.5, r * 0.05)} fill={tone.line} />
        {ring}
      </G>
    );
  }

  if (info.type === 'Grass') {
    return (
      <G>
        {driftPositions(quantity, info.spacingM * scale * 0.55).map((p, k) => (
          <G key={k}>
            <SoftShadow cx={cx + p.x} cy={cy + p.y} r={r * 0.6} dx={sh.dx} dy={sh.dy} />
            <Circle cx={cx + p.x} cy={cy + p.y} r={r * 0.85} fill="#f1ead2" stroke={PALETTE.grass} strokeWidth={0.5} />
            {Array.from({ length: 16 }, (_, j) => {
              const a = (j / 16) * Math.PI * 2;
              return <Line key={j} x1={cx + p.x} y1={cy + p.y} x2={cx + p.x + Math.cos(a) * r * 0.8} y2={cy + p.y + Math.sin(a) * r * 0.8} stroke={PALETTE.grass} strokeWidth={0.55} />;
            })}
          </G>
        ))}
        {ring}
      </G>
    );
  }

  const shrubLike = info.type === 'Shrub' || info.type === 'Climber';
  const positions = quantity > 1 ? driftPositions(quantity, info.spacingM * scale * 0.55) : [{ x: 0, y: 0 }];
  const rr = Math.max(r * (positions.length > 1 ? (shrubLike ? 0.8 : 0.65) : 0.95), 3.5);
  const fill = g(`p-${info.id}`);
  const line = tone.line;
  return (
    <G>
      {positions.map((p, k) => <SoftShadow key={`s${k}`} cx={cx + p.x} cy={cy + p.y} r={rr} dx={sh.dx} dy={sh.dy} />)}
      {positions.map((p, k) => (
        <G key={k}>
          <Path d={scallop(cx + p.x, cy + p.y, rr, shrubLike ? 11 : 8, `${id}${k}`, 0.08)} fill={fill} stroke={line} strokeWidth={0.6} />
          <LeafTexture kind={tone.tex} cx={cx + p.x} cy={cy + p.y} r={rr} colour={line} seed={`${id}${k}`} />
          <FlowerDots cx={cx + p.x} cy={cy + p.y} r={rr} colour={info.colour} seed={`${id}${k}`} n={shrubLike ? 3 : 1} />
        </G>
      ))}
      {ring}
    </G>
  );
}

/** Fine detail inside a plant symbol that hints at its leaf shape. */
function LeafTexture({ kind, cx, cy, r, colour, seed }: { kind: Texture; cx: number; cy: number; r: number; colour: string; seed: string }) {
  if (kind === 'none' || r < 5) return null;
  const rand = rng(seed + 't');
  const els: ReactElement[] = [];
  if (kind === 'leafy') {
    // Small curved leaf strokes, angled outwards.
    const n = Math.min(9, Math.round(r / 3));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.5, d = r * (0.35 + rand() * 0.3), l = r * 0.22;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const b = a + 0.9;
      els.push(<Path key={k} d={`M${x.toFixed(1)} ${y.toFixed(1)} q${(Math.cos(b) * l).toFixed(1)} ${(Math.sin(b) * l).toFixed(1)} ${(Math.cos(a) * l * 1.3).toFixed(1)} ${(Math.sin(a) * l * 1.3).toFixed(1)}`} stroke={colour} strokeWidth={0.5} fill="none" strokeLinecap="round" />);
    }
  } else if (kind === 'fine') {
    const n = Math.min(26, Math.round(r * 1.4));
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r * 0.78;
      els.push(<Circle key={k} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={0.55} fill={colour} />);
    }
  } else if (kind === 'needle') {
    const n = Math.min(22, Math.round(r * 1.2));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, d1 = r * (0.45 + rand() * 0.15), d2 = r * 0.85;
      els.push(<Line key={k} x1={cx + Math.cos(a) * d1} y1={cy + Math.sin(a) * d1} x2={cx + Math.cos(a) * d2} y2={cy + Math.sin(a) * d2} stroke={colour} strokeWidth={0.45} strokeLinecap="round" />);
    }
  } else if (kind === 'frond') {
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.3;
      const ex = cx + Math.cos(a) * r * 0.88, ey = cy + Math.sin(a) * r * 0.88;
      const qx = cx + Math.cos(a + 0.35) * r * 0.5, qy = cy + Math.sin(a + 0.35) * r * 0.5;
      els.push(<Path key={k} d={`M${cx.toFixed(1)} ${cy.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`} stroke={colour} strokeWidth={0.5} fill="none" />);
    }
  }
  return <G opacity={0.55}>{els}</G>;
}

function FlowerDots({ cx, cy, r, colour, seed, n }: { cx: number; cy: number; r: number; colour: string; seed: string; n: number }) {
  const rand = rng(seed + 'f');
  const rot = rand() * Math.PI * 2;
  const dotR = Math.max(1.2, r * (n === 1 ? 0.26 : 0.14));
  return (
    <G opacity={0.9}>
      {Array.from({ length: n }, (_, k) => {
        const a = rot + (k / n) * Math.PI * 2;
        const d = n === 1 ? 0 : r * 0.42;
        return <Circle key={k} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={dotR} fill={colour} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.5} />;
      })}
    </G>
  );
}

/** Sunflower-seed spiral: an even, natural-looking drift for n plants. */
function driftPositions(n: number, spacing: number) {
  if (n <= 1) return [{ x: 0, y: 0 }];
  return Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996;
    const d = Math.sqrt(i + 0.5) * spacing;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  });
}

// ---------- surfaces ----------

const bounds = (pts: { x: number; y: number }[]) => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

export function Surface({ f, X, Y, scale, clipId }: { f: Feature; X: Px; Y: Px; scale: number; clipId: string }) {
  const px = f.points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
  const pts = px.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const b = bounds(px);
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  const rand = rng(f.id);
  const tex: ReactElement[] = [];
  let base = '#f4f4f1';
  let edge = { stroke: PALETTE.ink, width: 0.8 };

  switch (f.kind) {
    case 'lawn': {
      base = PALETTE.lawn;
      const sw = 0.8 * scale; // mower stripes 0.8 m wide
      for (let x = b.x0, k = 0; x < b.x1; x += sw, k++) {
        if (k % 2) tex.push(<Rect key={k} x={x} y={b.y0} width={sw} height={h} fill={PALETTE.lawnStripe} />);
      }
      // Sparse grass tufts for a fine, mown texture.
      const n = Math.min(260, Math.round((w * h) / 650));
      for (let k = 0; k < n; k++) {
        const x = b.x0 + rand() * w, y = b.y0 + rand() * h;
        tex.push(<Path key={`g${k}`} d={`M${(x - 1.4).toFixed(1)} ${(y - 1.6).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${(x + 1.4).toFixed(1)} ${(y - 1.8).toFixed(1)}`} stroke="#a9c286" strokeWidth={0.5} fill="none" />);
      }
      edge = { stroke: '#7f9a68', width: 0.6 };
      break;
    }
    case 'patio': {
      base = PALETTE.stone[0];
      const sw = 0.9 * scale, sh = 0.6 * scale; // 900 x 600 mm slabs, running bond
      for (let y = b.y0, row = 0; y < b.y1; y += sh, row++) {
        for (let x = b.x0 - (row % 2 ? sw / 2 : 0); x < b.x1; x += sw) {
          tex.push(<Rect key={`${row}-${x.toFixed(0)}`} x={x} y={y} width={sw} height={sh} fill={PALETTE.stone[Math.floor(rand() * 3)]} stroke={PALETTE.joint} strokeWidth={0.6} />);
          // A light top-left edge on each slab gives the paving a little depth.
          tex.push(<Path key={`h${row}-${x.toFixed(0)}`} d={`M${(x + 1).toFixed(1)} ${(y + sh - 1).toFixed(1)} V${(y + 1).toFixed(1)} H${(x + sw - 1).toFixed(1)}`} stroke="#ffffff" strokeOpacity={0.8} strokeWidth={0.7} fill="none" />);
        }
      }
      edge = { stroke: '#8f8a7f', width: 0.8 };
      break;
    }
    case 'decking': {
      base = PALETTE.deck;
      const bw = 0.14 * scale;
      for (let y = b.y0 + bw, k = 0; y < b.y1; y += bw, k++) {
        tex.push(<Line key={k} x1={b.x0} y1={y} x2={b.x1} y2={y} stroke={PALETTE.deckLine} strokeWidth={0.5} />);
      }
      edge = { stroke: PALETTE.ink, width: 1.2 };
      break;
    }
    case 'path': {
      const bark = f.material === 'bark';
      base = bark ? PALETTE.bark : PALETTE.gravel;
      const n = Math.min(900, Math.round((w * h) / (bark ? 90 : 45)));
      for (let k = 0; k < n; k++) {
        const x = b.x0 + rand() * w, y = b.y0 + rand() * h;
        if (bark) {
          const a = rand() * Math.PI, l = 2 + rand() * 2.5;
          tex.push(<Line key={k} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke={PALETTE.barkFleck} strokeWidth={0.6} strokeLinecap="round" />);
        } else {
          tex.push(<Circle key={k} cx={x} cy={y} r={0.5 + rand() * 0.7} fill={PALETTE.gravelDot[Math.floor(rand() * 3)]} />);
        }
      }
      edge = { stroke: '#9a907c', width: 0.6 };
      break;
    }
    case 'bed':
    case 'raised_bed': {
      base = PALETTE.soil;
      const n = Math.min(500, Math.round((w * h) / 160));
      for (let k = 0; k < n; k++) {
        tex.push(<Circle key={k} cx={b.x0 + rand() * w} cy={b.y0 + rand() * h} r={0.5} fill={PALETTE.soilDot} />);
      }
      if (f.kind === 'raised_bed') {
        // Rows of crops across the bed.
        const rows = Math.max(2, Math.floor(h / (0.35 * scale)));
        for (let rI = 1; rI < rows; rI++) {
          const y = b.y0 + (h * rI) / rows;
          for (let x = b.x0 + 0.25 * scale; x < b.x1 - 0.15 * scale; x += 0.3 * scale) {
            tex.push(<Circle key={`c${rI}-${x.toFixed(0)}`} cx={x} cy={y} r={Math.max(2, 0.09 * scale)} fill={PALETTE.foliage} stroke={PALETTE.treeLine} strokeWidth={0.4} />);
          }
        }
      }
      edge = { stroke: f.kind === 'raised_bed' ? PALETTE.timber : '#a89678', width: f.kind === 'raised_bed' ? Math.max(2, 0.08 * scale) : 0.6 };
      break;
    }
    case 'pond': {
      base = PALETTE.water;
      for (let k = 1; k <= 3; k++) {
        tex.push(<Path key={k} d={`M${b.x0 + w * 0.2} ${b.y0 + (h * k) / 4} q${w * 0.15} ${-h * 0.06} ${w * 0.3} 0`} stroke={PALETTE.ripple} strokeWidth={0.8} fill="none" />);
      }
      edge = { stroke: '#4d7280', width: 1.2 };
      break;
    }
    case 'shed':
    case 'greenhouse':
    case 'house': {
      base = PALETTE.roof;
      // Roof ridge along the long side, with roof lines falling away from it.
      const alongX = w >= h;
      const step = 0.2 * scale;
      if (alongX) {
        const mid = b.y0 + h / 2;
        tex.push(<Line key="ridge" x1={b.x0} y1={mid} x2={b.x1} y2={mid} stroke={PALETTE.ink} strokeWidth={1} />);
        for (let x = b.x0 + step, k = 0; x < b.x1; x += step, k++) {
          tex.push(<Line key={k} x1={x} y1={b.y0} x2={x} y2={b.y1} stroke={PALETTE.roofLine} strokeWidth={0.5} />);
        }
      } else {
        const mid = b.x0 + w / 2;
        tex.push(<Line key="ridge" x1={mid} y1={b.y0} x2={mid} y2={b.y1} stroke={PALETTE.ink} strokeWidth={1} />);
        for (let y = b.y0 + step, k = 0; y < b.y1; y += step, k++) {
          tex.push(<Line key={k} x1={b.x0} y1={y} x2={b.x1} y2={y} stroke={PALETTE.roofLine} strokeWidth={0.5} />);
        }
      }
      edge = { stroke: PALETTE.ink, width: 1.4 };
      break;
    }
    default:
      break;
  }

  const isBuilding = f.kind === 'shed' || f.kind === 'greenhouse' || f.kind === 'house';
  const sh = shadowOffset(isBuilding ? 2.4 : 0, scale);
  return (
    <G>
      {isBuilding && (
        <Polygon points={px.map((p) => `${(p.x + sh.dx).toFixed(1)},${(p.y + sh.dy).toFixed(1)}`).join(' ')} fill={PALETTE.shadow} />
      )}
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={pts} />
        </ClipPath>
      </Defs>
      <Polygon points={pts} fill={base} />
      <G clipPath={`url(#${clipId})`}>{tex}</G>
      <Polygon points={pts} fill="none" stroke={edge.stroke} strokeWidth={edge.width} strokeLinejoin="round" />
      {f.kind === 'raised_bed' && <Polygon points={pts} fill="none" stroke={PALETTE.ink} strokeWidth={0.4} />}
    </G>
  );
}

// ---------- furniture ----------

const FURN = { fill: '#ffffff', line: '#3a3f3b', timber: '#efe3cc', timberLine: '#c4a983', cushion: '#f4f1ea' };

/** A chair seen from above. rot 0 has the backrest at the top, so the sitter faces down the page. */
function Chair({ cx, cy, s, rot }: { cx: number; cy: number; s: number; rot: number }) {
  const w = 0.48 * s, d = 0.46 * s, back = 0.09 * s;
  return (
    <G rotation={rot} origin={`${cx}, ${cy}`}>
      <Rect x={cx - w / 2 + 0.04 * s} y={cy - d / 2 + 0.04 * s} width={w} height={d} rx={0.07 * s} fill={PALETTE.shadow} />
      <Rect x={cx - w / 2} y={cy - d / 2} width={w} height={d} rx={0.07 * s} fill={FURN.fill} stroke={FURN.line} strokeWidth={0.6} />
      <Rect x={cx - w / 2} y={cy - d / 2 - back * 0.4} width={w} height={back} rx={back / 2} fill={FURN.line} />
    </G>
  );
}

function FurnShadow({ x, y, w, h, rx, scale }: { x: number; y: number; w: number; h: number; rx: number; scale: number }) {
  const sh = shadowOffset(0.8, scale);
  return <Rect x={x + sh.dx} y={y + sh.dy} width={w} height={h} rx={rx} fill={PALETTE.shadow} />;
}

export function FurnitureSymbol({ item, cx, cy, scale }: { item: Furniture; cx: number; cy: number; scale: number }) {
  const s = scale;
  const m = (v: number) => v * s;
  let body: ReactElement | null = null;

  switch (item.kind) {
    case 'dining_set': {
      const n = Math.max(2, item.seats || 6);
      const ends = n >= 6 ? 2 : 0;
      const perSide = Math.ceil((n - ends) / 2);
      const L = Math.max(0.9, perSide * 0.62 + 0.25), W = 0.9;
      const x0 = cx - m(L) / 2, y0 = cy - m(W) / 2;
      const chairs: ReactElement[] = [];
      for (let k = 0; k < perSide; k++) {
        const x = x0 + m(0.25 / 2 + 0.31 + k * 0.62);
        chairs.push(<Chair key={`t${k}`} cx={x} cy={y0 - m(0.2)} s={s} rot={0} />);
        if (k < n - ends - perSide) chairs.push(<Chair key={`b${k}`} cx={x} cy={y0 + m(W) + m(0.2)} s={s} rot={180} />);
      }
      if (ends) {
        chairs.push(<Chair key="l" cx={x0 - m(0.2)} cy={cy} s={s} rot={-90} />);
        chairs.push(<Chair key="r" cx={x0 + m(L) + m(0.2)} cy={cy} s={s} rot={90} />);
      }
      const slats = Math.round(L / 0.12);
      body = (
        <G>
          {chairs}
          <FurnShadow x={x0} y={y0} w={m(L)} h={m(W)} rx={m(0.04)} scale={s} />
          <Rect x={x0} y={y0} width={m(L)} height={m(W)} rx={m(0.04)} fill={FURN.timber} stroke={FURN.line} strokeWidth={0.8} />
          {Array.from({ length: slats - 1 }, (_, k) => (
            <Line key={k} x1={x0 + (m(L) * (k + 1)) / slats} y1={y0 + 1} x2={x0 + (m(L) * (k + 1)) / slats} y2={y0 + m(W) - 1} stroke={FURN.timberLine} strokeWidth={0.4} />
          ))}
        </G>
      );
      break;
    }
    case 'bistro_set': {
      const n = Math.max(2, item.seats || 2);
      const r = m(0.35);
      body = (
        <G>
          <Circle cx={cx + shadowOffset(0.8, s).dx} cy={cy + shadowOffset(0.8, s).dy} r={r} fill={PALETTE.shadow} />
          {Array.from({ length: n }, (_, k) => {
            const deg = (k / n) * 360;
            const a = ((deg - 90) * Math.PI) / 180;
            return <Chair key={k} cx={cx + Math.cos(a) * (r + m(0.28))} cy={cy + Math.sin(a) * (r + m(0.28))} s={s} rot={deg} />;
          })}
          <Circle cx={cx} cy={cy} r={r} fill={FURN.timber} stroke={FURN.line} strokeWidth={0.8} />
          <Circle cx={cx} cy={cy} r={r * 0.75} fill="none" stroke={FURN.timberLine} strokeWidth={0.4} />
        </G>
      );
      break;
    }
    case 'bench': {
      const L = 1.5, D = 0.5;
      const x0 = cx - m(L) / 2, y0 = cy - m(D) / 2;
      body = (
        <G>
          <FurnShadow x={x0} y={y0} w={m(L)} h={m(D)} rx={m(0.04)} scale={s} />
          <Rect x={x0} y={y0} width={m(L)} height={m(D)} rx={m(0.04)} fill={FURN.timber} stroke={FURN.line} strokeWidth={0.8} />
          {[0.33, 0.55, 0.77].map((f) => (
            <Line key={f} x1={x0 + 1} y1={y0 + m(D) * f} x2={x0 + m(L) - 1} y2={y0 + m(D) * f} stroke={FURN.timberLine} strokeWidth={0.45} />
          ))}
          <Rect x={x0} y={y0} width={m(L)} height={m(0.11)} rx={m(0.03)} fill={FURN.line} />
        </G>
      );
      break;
    }
    case 'lounger': {
      const W = 0.68, L = 1.95;
      const x0 = cx - m(W) / 2, y0 = cy - m(L) / 2;
      body = (
        <G>
          <FurnShadow x={x0} y={y0} w={m(W)} h={m(L)} rx={m(0.08)} scale={s} />
          <Rect x={x0} y={y0} width={m(W)} height={m(L)} rx={m(0.08)} fill={FURN.fill} stroke={FURN.line} strokeWidth={0.8} />
          {/* Raised back rest, then the cushion and a pillow */}
          <Line x1={x0} y1={y0 + m(0.62)} x2={x0 + m(W)} y2={y0 + m(0.62)} stroke={FURN.line} strokeWidth={0.6} />
          <Rect x={x0 + m(0.06)} y={y0 + m(0.06)} width={m(W - 0.12)} height={m(L - 0.12)} rx={m(0.06)} fill={FURN.cushion} stroke={FURN.line} strokeOpacity={0.5} strokeWidth={0.4} />
          <Rect x={x0 + m(0.12)} y={y0 + m(0.1)} width={m(W - 0.24)} height={m(0.3)} rx={m(0.1)} fill={FURN.fill} stroke={FURN.line} strokeWidth={0.5} />
          {[0.95, 1.25, 1.55].map((f) => (
            <Line key={f} x1={x0 + m(0.06)} y1={y0 + m(f)} x2={x0 + m(W - 0.06)} y2={y0 + m(f)} stroke={FURN.line} strokeOpacity={0.35} strokeWidth={0.4} />
          ))}
        </G>
      );
      break;
    }
    case 'sofa': {
      const L = 2.0, D = 0.85, arm = 0.16, back = 0.2;
      const x0 = cx - m(L) / 2, y0 = cy - m(D) / 2;
      const seatW = (L - arm * 2) / 3;
      body = (
        <G>
          <FurnShadow x={x0} y={y0} w={m(L)} h={m(D)} rx={m(0.1)} scale={s} />
          <Rect x={x0} y={y0} width={m(L)} height={m(D)} rx={m(0.1)} fill={FURN.fill} stroke={FURN.line} strokeWidth={0.8} />
          {[0, 1, 2].map((k) => (
            <Rect key={k} x={x0 + m(arm + k * seatW) + 0.6} y={y0 + m(back)} width={m(seatW) - 1.2} height={m(D - back - 0.04)} rx={m(0.05)} fill={FURN.cushion} stroke={FURN.line} strokeWidth={0.5} />
          ))}
          <Line x1={x0 + m(arm)} y1={y0 + m(back)} x2={x0 + m(L - arm)} y2={y0 + m(back)} stroke={FURN.line} strokeWidth={0.6} />
        </G>
      );
      break;
    }
    case 'fire_pit': {
      const r = m(0.45);
      body = (
        <G>
          <Circle cx={cx + shadowOffset(0.4, s).dx} cy={cy + shadowOffset(0.4, s).dy} r={r} fill={PALETTE.shadow} />
          <Circle cx={cx} cy={cy} r={r} fill="#d9d5cc" stroke={FURN.line} strokeWidth={0.8} />
          <Circle cx={cx} cy={cy} r={r * 0.7} fill="#5b524a" />
          <Circle cx={cx} cy={cy} r={r * 0.4} fill="#e39a52" opacity={0.85} />
        </G>
      );
      break;
    }
    case 'pot': {
      const r = m(0.25);
      const sh = shadowOffset(0.6, s);
      body = (
        <G>
          <Circle cx={cx + sh.dx} cy={cy + sh.dy} r={r} fill={PALETTE.shadow} />
          <Circle cx={cx} cy={cy} r={r} fill="#d39a72" stroke="#8c5a3c" strokeWidth={0.7} />
          <Path d={scallop(cx, cy, r * 0.78, 8, item.id, 0.1)} fill={PALETTE.shrub} stroke={PALETTE.treeLine} strokeWidth={0.5} />
        </G>
      );
      break;
    }
  }
  if (!body) return null;
  return item.rotDeg ? <G rotation={item.rotDeg} origin={`${cx}, ${cy}`}>{body}</G> : body;
}
