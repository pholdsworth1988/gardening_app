// Drawing style for the technical plan: plant symbols, shadows and surface textures.
// Everything is drawn in code from the layout, so it scales to each plant's real size
// and stays editable. All randomness is seeded from ids, so a plan always looks the same.

import type { ReactElement } from 'react';
import { Circle, ClipPath, Defs, G, Line, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { PlantInfo } from '@/data/plants';
import type { Feature } from '@/data/types';

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
  const ring = selected ? <Circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#2f5d3a" strokeWidth={2} strokeDasharray="4 3" /> : null;

  if (info.type === 'Tree') {
    const spokes = 10;
    return (
      <G>
        <SoftShadow cx={cx} cy={cy} r={r} dx={sh.dx} dy={sh.dy} />
        <Path d={scallop(cx, cy, r, Math.round(14 + r / 5), id, 0.05)} fill={g('tree')} stroke={PALETTE.treeLine} strokeWidth={0.7} />
        <Circle cx={cx} cy={cy} r={r * 0.64} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={0.6} />
        {Array.from({ length: spokes }, (_, k) => {
          const a = (k / spokes) * Math.PI * 2;
          return <Line key={k} x1={cx + Math.cos(a) * r * 0.1} y1={cy + Math.sin(a) * r * 0.1} x2={cx + Math.cos(a) * r * 0.9} y2={cy + Math.sin(a) * r * 0.9} stroke={PALETTE.treeLine} strokeOpacity={0.35} strokeWidth={0.45} />;
        })}
        <Circle cx={cx} cy={cy} r={Math.max(1.5, r * 0.05)} fill={PALETTE.treeLine} />
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
  const fill = shrubLike ? g('shrub') : g('foliage');
  const line = PALETTE.treeLine;
  return (
    <G>
      {positions.map((p, k) => <SoftShadow key={`s${k}`} cx={cx + p.x} cy={cy + p.y} r={rr} dx={sh.dx} dy={sh.dy} />)}
      {positions.map((p, k) => (
        <G key={k}>
          <Path d={scallop(cx + p.x, cy + p.y, rr, shrubLike ? 11 : 8, `${id}${k}`, 0.08)} fill={fill} stroke={line} strokeWidth={0.6} />
          <FlowerDots cx={cx + p.x} cy={cy + p.y} r={rr} colour={info.colour} seed={`${id}${k}`} n={shrubLike ? 3 : 1} />
        </G>
      ))}
      {ring}
    </G>
  );
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
      edge = { stroke: '#7f9a68', width: 0.6 };
      break;
    }
    case 'patio': {
      base = PALETTE.stone[0];
      const sw = 0.9 * scale, sh = 0.6 * scale; // 900 x 600 mm slabs, running bond
      for (let y = b.y0, row = 0; y < b.y1; y += sh, row++) {
        for (let x = b.x0 - (row % 2 ? sw / 2 : 0); x < b.x1; x += sw) {
          tex.push(<Rect key={`${row}-${x.toFixed(0)}`} x={x} y={y} width={sw} height={sh} fill={PALETTE.stone[Math.floor(rand() * 3)]} stroke={PALETTE.joint} strokeWidth={0.6} />);
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
