// Drawing style for the technical plan: plant symbols, shadows and surface textures.
// Everything is drawn in code from the layout, so it scales to each plant's real size
// and stays editable. All randomness is seeded from ids, so a plan always looks the same.

import type { ReactElement } from 'react';
import { Circle, ClipPath, Defs, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import type { PlantInfo } from '@/data/plants';
import type { Feature } from '@/data/types';

type Px = (m: number) => number;

// Palette matched to Phil's reference: hand-rendered marker plans on white paper,
// bright yellow-greens with darker shading on the shadow side, crisp black linework.
export const PALETTE = {
  paper: '#ffffff',
  ink: '#1d2420',
  shadow: 'rgba(30, 40, 28, 0.22)',
  lawn: '#dcebb3', lawnStripe: '#d0e3a1',
  soil: '#efe6d4', soilDot: '#c4b08f',
  stone: ['#efefec', '#e8e7e2', '#f4f3f0'], joint: '#b9b6ad',
  gravel: '#f1ede3', gravelDot: ['#bdb4a1', '#a39a86', '#d2cab8'],
  bark: '#d3b993', barkFleck: '#93734f',
  timber: '#8a6a44', deck: '#e3cfae', deckLine: '#a98a63',
  roof: '#e6e3dd', roofLine: '#b3afa6',
  water: '#bfe0ea', ripple: '#7fb0c2',
  tree: '#b8d36b', treeShade: '#7ea43f', treeDark: '#3f5f2a', treeLight: '#dcebA0',
  shrub: '#97c457', shrubShade: '#6b9634', shrubDark: '#3f5f2a',
  foliage: '#a8cf63', grass: '#b8a265',
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

/**
 * A hand-drawn version of a straight-edged outline: each edge wobbles slightly and
 * overshoots its corners a little, the way a designer's pen does.
 */
export function sketchOutline(pts: { x: number; y: number }[], seed: string, closed = true, amp = 0.7) {
  const rand = rng(seed + 'pen');
  const n = closed ? pts.length : pts.length - 1;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.5) continue;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const over = Math.min(3.5, len * 0.08);
    const sx = a.x - ux * over * rand(), sy = a.y - uy * over * rand();
    const ex = b.x + ux * over * rand(), ey = b.y + uy * over * rand();
    const steps = Math.max(1, Math.round(len / 14));
    d += ` M${sx.toFixed(1)} ${sy.toFixed(1)}`;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const off = (rand() - 0.5) * 2 * amp;
      const mx = sx + (ex - sx) * (t - 0.5 / steps) - uy * off;
      const my = sy + (ey - sy) * (t - 0.5 / steps) + ux * off;
      d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${(sx + (ex - sx) * t).toFixed(1)} ${(sy + (ey - sy) * t).toFixed(1)}`;
    }
  }
  return d.trim();
}

/** Marker strokes across the shadow side of a round plant, like a designer's felt-tip shading. */
function MarkerShade({ cx, cy, r, colour, seed }: { cx: number; cy: number; r: number; colour: string; seed: string }) {
  const rand = rng(seed + 'mk');
  const R = r * 0.86;
  const strokes = [];
  const w = Math.max(1.4, r * 0.11);
  for (let off = r * 0.05; off < R * 0.95; off += w * 0.9) {
    const half = Math.sqrt(R * R - off * off) * (0.85 + rand() * 0.15);
    // Centre of the chord, offset towards the shadow side (bottom right).
    const mx = cx + off * Math.SQRT1_2, my = cy + off * Math.SQRT1_2;
    strokes.push(
      <Line key={off.toFixed(1)} x1={mx - half * Math.SQRT1_2} y1={my + half * Math.SQRT1_2} x2={mx + half * Math.SQRT1_2} y2={my - half * Math.SQRT1_2}
        stroke={colour} strokeWidth={w} strokeLinecap="round" opacity={0.28 + rand() * 0.12} />,
    );
  }
  return <G>{strokes}</G>;
}

// ---------- plant symbols ----------

export function PlantSymbol({ info, id, cx, cy, quantity, scale, selected }: {
  info: PlantInfo; id: string; cx: number; cy: number; quantity: number; scale: number; selected: boolean;
}) {
  const r = Math.max((info.spreadM / 2) * scale, 4);
  const sh = shadowOffset(info.heightM, scale);
  const ring = selected ? <Circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#2f5d3a" strokeWidth={2.5} strokeDasharray="5 3" /> : null;

  if (info.type === 'Tree') {
    const rand = rng(id + 'b');
    const canopy = scallop(cx, cy, r, Math.round(10 + r / 6), id);
    return (
      <G>
        <Path d={scallop(cx + sh.dx, cy + sh.dy, r, Math.round(10 + r / 6), id)} fill={PALETTE.shadow} />
        <Path d={canopy} fill={PALETTE.tree} />
        {/* Marker shading on the shadow side, highlight on the sunny side */}
        <Path d={scallop(cx + r * 0.16, cy + r * 0.13, r * 0.84, Math.round(9 + r / 7), id + 's', 0.18)} fill={PALETTE.treeShade} opacity={0.3} />
        <MarkerShade cx={cx} cy={cy} r={r} colour={PALETTE.treeShade} seed={id} />
        <Path d={scallop(cx - r * 0.2, cy - r * 0.18, r * 0.5, 8, id + 'i', 0.2)} fill={PALETTE.treeLight} opacity={0.85} />
        <Path d={canopy} fill="none" stroke={PALETTE.treeDark} strokeWidth={0.9} />
        {Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
          return <Line key={k} x1={cx} y1={cy} x2={cx + Math.cos(a) * r * 0.72} y2={cy + Math.sin(a) * r * 0.72} stroke={PALETTE.treeDark} strokeWidth={0.5} opacity={0.55} />;
        })}
        <Circle cx={cx} cy={cy} r={Math.max(1.6, r * 0.06)} fill={PALETTE.treeDark} />
        {ring}
      </G>
    );
  }

  if (info.type === 'Grass') {
    const rand = rng(id);
    return (
      <G>
        {driftPositions(quantity, info.spacingM * scale * 0.55).map((p, k) => (
          <G key={k}>
            <Circle cx={cx + p.x + sh.dx} cy={cy + p.y + sh.dy} r={r * 0.7} fill={PALETTE.shadow} />
            {Array.from({ length: 14 }, (_, j) => {
              const a = (j / 14) * Math.PI * 2 + rand() * 0.3;
              const len = r * (0.75 + rand() * 0.3);
              return <Line key={j} x1={cx + p.x} y1={cy + p.y} x2={cx + p.x + Math.cos(a) * len} y2={cy + p.y + Math.sin(a) * len} stroke={PALETTE.grass} strokeWidth={0.9} />;
            })}
          </G>
        ))}
        {ring}
      </G>
    );
  }

  if (info.type === 'Shrub' || info.type === 'Climber') {
    const positions = info.type === 'Shrub' && quantity > 1 ? driftPositions(quantity, info.spacingM * scale * 0.55) : [{ x: 0, y: 0 }];
    const rr = positions.length > 1 ? r * 0.8 : r;
    return (
      <G>
        {positions.map((p, k) => (
          <Path key={`s${k}`} d={scallop(cx + p.x + sh.dx, cy + p.y + sh.dy, rr, 9, `${id}${k}`, 0.22)} fill={PALETTE.shadow} />
        ))}
        {positions.map((p, k) => (
          <G key={k}>
            <Path d={scallop(cx + p.x, cy + p.y, rr, 9, `${id}${k}`, 0.22)} fill={PALETTE.shrub} />
            <MarkerShade cx={cx + p.x} cy={cy + p.y} r={rr} colour={PALETTE.shrubShade} seed={`${id}${k}`} />
            <Path d={scallop(cx + p.x, cy + p.y, rr, 9, `${id}${k}`, 0.22)} fill="none" stroke={PALETTE.shrubDark} strokeWidth={0.8} />
            <Path d={`M${cx + p.x - rr * 0.35} ${cy + p.y} q${rr * 0.15} ${-rr * 0.25} ${rr * 0.3} 0 M${cx + p.x + rr * 0.05} ${cy + p.y + rr * 0.3} q${rr * 0.15} ${-rr * 0.25} ${rr * 0.3} 0`} stroke={PALETTE.shrubDark} strokeWidth={0.5} fill="none" opacity={0.6} />
            <FlowerDots cx={cx + p.x} cy={cy + p.y} r={rr} colour={info.colour} seed={`${id}${k}`} n={info.type === 'Climber' ? 6 : 4} />
          </G>
        ))}
        {ring}
      </G>
    );
  }

  // Perennials and herbs: a drift of small clumps, one per plant.
  const positions = driftPositions(quantity, info.spacingM * scale * 0.55);
  const rr = Math.max(r * (quantity > 1 ? 0.65 : 0.9), 3.5);
  return (
    <G>
      {positions.map((p, k) => (
        <Path key={`s${k}`} d={scallop(cx + p.x + sh.dx, cy + p.y + sh.dy, rr, 7, `${id}${k}`, 0.3)} fill={PALETTE.shadow} />
      ))}
      {positions.map((p, k) => (
        <G key={k}>
          <Path d={scallop(cx + p.x, cy + p.y, rr, 7, `${id}${k}`, 0.3)} fill={PALETTE.foliage} />
          <MarkerShade cx={cx + p.x} cy={cy + p.y} r={rr} colour={PALETTE.shrubShade} seed={`${id}${k}`} />
          <Path d={scallop(cx + p.x, cy + p.y, rr, 7, `${id}${k}`, 0.3)} fill="none" stroke={PALETTE.shrubDark} strokeWidth={0.6} />
          <FlowerDots cx={cx + p.x} cy={cy + p.y} r={rr} colour={info.colour} seed={`${id}${k}`} n={5} />
        </G>
      ))}
      {ring}
    </G>
  );
}

function FlowerDots({ cx, cy, r, colour, seed, n }: { cx: number; cy: number; r: number; colour: string; seed: string; n: number }) {
  const rand = rng(seed + 'f');
  return (
    <G>
      {Array.from({ length: n }, (_, k) => {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * r * 0.6;
        return <Circle key={k} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={Math.max(1.1, r * 0.12)} fill={colour} />;
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
      edge = { stroke: '#6f8a5c', width: 0.9 };
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
      edge = { stroke: PALETTE.ink, width: 1.2 };
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
      const n = Math.min(900, Math.round((w * h) / (bark ? 55 : 28)));
      for (let k = 0; k < n; k++) {
        const x = b.x0 + rand() * w, y = b.y0 + rand() * h;
        if (bark) {
          const a = rand() * Math.PI, l = 2 + rand() * 2.5;
          tex.push(<Line key={k} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke={PALETTE.barkFleck} strokeWidth={0.8} />);
        } else {
          tex.push(<Circle key={k} cx={x} cy={y} r={0.5 + rand() * 0.7} fill={PALETTE.gravelDot[Math.floor(rand() * 3)]} />);
        }
      }
      edge = { stroke: '#7d7564', width: 0.8 };
      break;
    }
    case 'bed':
    case 'raised_bed': {
      base = PALETTE.soil;
      const n = Math.min(500, Math.round((w * h) / 90));
      for (let k = 0; k < n; k++) {
        tex.push(<Circle key={k} cx={b.x0 + rand() * w} cy={b.y0 + rand() * h} r={0.55} fill={PALETTE.soilDot} />);
      }
      if (f.kind === 'raised_bed') {
        // Rows of crops across the bed.
        const rows = Math.max(2, Math.floor(h / (0.35 * scale)));
        for (let rI = 1; rI < rows; rI++) {
          const y = b.y0 + (h * rI) / rows;
          for (let x = b.x0 + 0.25 * scale; x < b.x1 - 0.15 * scale; x += 0.3 * scale) {
            tex.push(<Path key={`c${rI}-${x.toFixed(0)}`} d={scallop(x, y, Math.max(2.2, 0.1 * scale), 5, `${f.id}${rI}${x.toFixed(0)}`, 0.3)} fill={PALETTE.foliage} stroke={PALETTE.shrubDark} strokeWidth={0.4} />);
          }
        }
      }
      edge = { stroke: f.kind === 'raised_bed' ? PALETTE.timber : '#7a6a52', width: f.kind === 'raised_bed' ? Math.max(2, 0.08 * scale) : 0.9 };
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
      edge = { stroke: PALETTE.ink, width: 1.6 };
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
      {f.kind === 'raised_bed' ? (
        <>
          <Polygon points={pts} fill="none" stroke={edge.stroke} strokeWidth={edge.width} />
          <Path d={sketchOutline(px, f.id)} fill="none" stroke={PALETTE.ink} strokeWidth={0.6} strokeLinecap="round" />
        </>
      ) : (
        <Path d={sketchOutline(px, f.id)} fill="none" stroke={edge.stroke} strokeWidth={edge.width} strokeLinecap="round" />
      )}
    </G>
  );
}
