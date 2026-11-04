import Svg, { Circle, ClipPath, Defs, G, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { plantById } from '@/data/plants';
import { FurnitureSymbol, PALETTE, PlanDefs, PlantSymbol, Surface } from './planStyle';
import type { Feature, Garden } from '@/data/types';

export type Mode = 'plan' | 'concept';

// Padding around the garden for dimensions, scale bar and north arrow.
export const PAD = { left: 40, top: 34, right: 14, bottom: 58 };

export const LABEL_COL = 116; // right-hand column for plant names

export function garden2px(garden: Garden, width: number, annotate = false) {
  const right = annotate ? LABEL_COL : PAD.right;
  const scale = (width - PAD.left - right) / garden.widthM; // px per metre
  return {
    scale,
    height: garden.depthM * scale + PAD.top + PAD.bottom,
    X: (m: number) => PAD.left + m * scale,
    Y: (m: number) => PAD.top + m * scale,
  };
}

const INK = '#1d2420';
const FONT = 'Helvetica, Arial, sans-serif';

const PLAN_FILL: Partial<Record<Feature['kind'], string>> = {
  lawn: '#e3eedb', bed: '#efe4d2', raised_bed: '#e8d8bd', path: '#f1ede4', patio: '#ecebe6',
  decking: '#eadfcf', pond: '#d6e6ee', shed: '#ffffff', hedge: '#cfdcc6', house: '#ffffff',
};
const CONCEPT_FILL: Partial<Record<Feature['kind'], string>> = {
  lawn: '#9cc27e', bed: '#8a6a4a', raised_bed: '#a07a52', path: '#d9cdb5', patio: '#cfc6b4',
  decking: '#b98d5f', pond: '#7fb2c9', shed: '#7d6a58', hedge: '#4f7a4c', house: '#bdb5a6',
};

type Props = {
  garden: Garden;
  width: number;
  mode: Mode;
  selectedId?: string | null;
  showNumbers?: boolean;
  thumbnail?: boolean; // no labels or north arrow
  annotate?: boolean; // plant names in a side column with leader lines
  titleBlock?: boolean; // designer's title strip under the plan
};

const TB_H = 52; // extra height for the title block

export default function GardenSvg({ garden, width, mode, selectedId, showNumbers = true, thumbnail = false, annotate = false, titleBlock = false }: Props) {
  const plan = mode === 'plan';
  const tb = plan && titleBlock && !thumbnail;
  const base = garden2px(garden, width, annotate && plan);
  const { scale, X, Y } = base;
  const height = base.height + (tb ? TB_H : 0);
  const gw = garden.widthM * scale;
  const gh = garden.depthM * scale;
  // Borders go down first, so a curving lawn and paths can be cut out of them.
  const order = ['bed', 'lawn', 'path', 'patio', 'decking', 'raised_bed', 'pond', 'hedge'];
  // Ground surfaces first so structures sit on top; unknown kinds last.
  const rank = (f: Feature) => (order.includes(f.kind) ? order.indexOf(f.kind) : order.length);
  const feats = [...garden.features].sort((a, b) => rank(a) - rank(b));
  const hasFurniture = (f: Feature) => {
    const xs = f.points.map((q) => q.x), ys = f.points.map((q) => q.y);
    return (garden.furniture ?? []).some((it) => it.x > Math.min(...xs) && it.x < Math.max(...xs) && it.y > Math.min(...ys) && it.y < Math.max(...ys));
  };

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fontFamily={FONT}>
      <Rect x={0} y={0} width={width} height={height} fill={plan ? PALETTE.paper : '#f3f0e6'} />

      {/* Metre ticks along the boundary, as on a drawn plan */}
      {plan && (
        <G>
          {Array.from({ length: Math.floor(garden.widthM) + 1 }, (_, i) => (
            <Line key={`tx${i}`} x1={X(i)} y1={Y(0) - 4} x2={X(i)} y2={Y(0)} stroke={INK} strokeWidth={0.5} />
          ))}
          {Array.from({ length: Math.floor(garden.depthM) + 1 }, (_, j) => (
            <Line key={`ty${j}`} x1={X(0) - 4} y1={Y(j)} x2={X(0)} y2={Y(j)} stroke={INK} strokeWidth={0.5} />
          ))}
        </G>
      )}

      {!plan && <Rect x={X(0)} y={Y(0)} width={gw} height={gh} fill="#b7cf9f" />}

      {plan && <PlanDefs prefix={`g-${garden.id}`} />}

      {/* Keep everything, shadows included, inside the garden boundary */}
      <Defs>
        <ClipPath id={`garden-${garden.id}-${mode}`}>
          <Rect x={X(0)} y={Y(0)} width={gw} height={gh} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#garden-${garden.id}-${mode})`}>
      {feats.map((f) => {
        const fill = (plan ? PLAN_FILL : CONCEPT_FILL)[f.kind] ?? (plan ? '#f4f4f1' : '#c9c2b2');
        const selected = f.id === selectedId;
        const stroke = selected ? '#2f5d3a' : plan ? INK : 'rgba(0,0,0,0.15)';
        const sw = selected ? 3 : plan ? 1 : 0.8;
        if (f.shape === 'circle') {
          return <Circle key={f.id} cx={X(f.center.x)} cy={Y(f.center.y)} r={f.radius_m * scale} fill={fill} stroke={stroke} strokeWidth={sw} />;
        }
        const pts = f.points.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ');
        if (f.kind === 'fence' || f.kind === 'wall') {
          return <Polyline key={f.id} points={pts} fill="none" stroke={stroke} strokeWidth={2.2} strokeDasharray={f.kind === 'fence' ? '6 3' : undefined} />;
        }
        if (plan) {
          return (
            <G key={f.id}>
              <Surface f={f} X={X} Y={Y} scale={scale} clipId={`clip-${garden.id}-${f.id}`} />
              {selected && <Polygon points={pts} fill="none" stroke="#2f5d3a" strokeWidth={3} strokeDasharray="6 3" />}
            </G>
          );
        }
        return <Polygon key={f.id} points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
      })}

      {/* Furniture sits on the surfaces, under any overhanging plants */}
      {(garden.furniture ?? []).map((it) => (
        <FurnitureSymbol key={it.id} item={it} cx={X(it.x)} cy={Y(it.y)} scale={scale} />
      ))}

      {/* Plants */}
      {[...garden.plants.map((p, i) => ({ p, i }))]
        .sort((a, b) => (plantById(a.p.plantId)?.heightM ?? 0) - (plantById(b.p.plantId)?.heightM ?? 0))
        .map(({ p, i }) => {
        const info = plantById(p.plantId);
        const r = Math.max(((info?.spreadM ?? 0.5) / 2) * scale, 5);
        const cx = X(p.x);
        const cy = Y(p.y);
        const selected = p.id === selectedId;
        if (!plan) {
          return (
            <G key={p.id}>
              <Circle cx={cx + 2} cy={cy + 3} r={r} fill="rgba(0,0,0,0.12)" />
              <Circle cx={cx} cy={cy} r={r} fill={info?.colour ?? '#5f8a6a'} stroke={selected ? '#ffffff' : 'none'} strokeWidth={3} />
              <Circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.35} fill="rgba(255,255,255,0.25)" />
            </G>
          );
        }
        return (
          <G key={p.id}>
            {info && <PlantSymbol info={info} id={p.id} cx={cx} cy={cy} quantity={p.quantity} scale={scale} selected={selected} gradPrefix={`g-${garden.id}`} />}
          </G>
        );
      })}

      {/* Number tags last, so taller plants never hide them */}
      {plan && showNumbers && !annotate && garden.plants.map((p, i) => {
        const info = plantById(p.plantId);
        const r = Math.max(((info?.spreadM ?? 0.5) / 2) * scale, 5);
        const cx = X(p.x), cy = Y(p.y);
        return (
          <G key={`n${p.id}`}>
            {(() => {
              // Tag sits at the canopy's top-right; flip to top-left near the right boundary.
              const flip = cx + r * 0.71 + 13 > X(0) + gw;
              const dx = flip ? -1 : 1;
              const ex = cx + dx * r * 0.71, ey = cy - r * 0.71;
              const tx = ex + dx * 5, ty = Math.max(Y(0) + 8, ey - 5);
              return (
                <G>
                  <Line x1={ex} y1={ey} x2={tx} y2={ty} stroke={INK} strokeWidth={0.6} />
                  <Circle cx={tx} cy={ty} r={6.5} fill={INK} />
                  <SvgText x={tx} y={ty + 3} fontSize={8} fontWeight="700" textAnchor="middle" fill="#ffffff">{i + 1}</SvgText>
                </G>
              );
            })()}
          </G>
        );
      })}

      </G>

      {/* Labels */}
      {!thumbnail && feats.filter((f) => f.label && f.kind !== 'fence' && f.kind !== 'wall').map((f) => {
        const common = {
          x: X(f.center.x),
          // Beds and seating areas are labelled along their bottom edge, clear of plants and furniture.
          y: plan && (f.kind === 'bed' || f.kind === 'raised_bed' || hasFurniture(f))
            ? Y(Math.max(...f.points.map((q) => q.y))) - 6
            : Y(f.center.y) + 4,
          fontSize: plan ? 10 : 11,
          fontWeight: plan ? '400' : '600', letterSpacing: 0.6, textAnchor: 'middle' as const,
        };
        return (
          <G key={`l${f.id}`}>
            {/* Halo first, then the text, so labels read over any fill */}
            <SvgText {...common} fill="none" stroke={plan ? '#ffffff' : 'rgba(0,0,0,0.35)'} strokeWidth={plan ? 3 : 2.5} strokeLinejoin="round">
              {f.label.toUpperCase()}
            </SvgText>
            <SvgText {...common} fill={plan ? INK : '#ffffff'}>{f.label.toUpperCase()}</SvgText>
          </G>
        );
      })}

      <Rect x={X(0)} y={Y(0)} width={gw} height={gh} fill="none" stroke={INK} strokeWidth={plan ? 2.2 : 1} />
      {plan && annotate && <PlantLabels garden={garden} X={X} Y={Y} scale={scale} width={width} />}

      {plan && (
        <G>
          <DimLine x1={X(0)} y1={Y(0) - 18} x2={X(garden.widthM)} y2={Y(0) - 18} text={`${garden.widthM.toFixed(2)} m`} />
          <DimLine x1={X(0) - 22} y1={Y(0)} x2={X(0) - 22} y2={Y(garden.depthM)} text={`${garden.depthM.toFixed(2)} m`} vertical />
          <ScaleBar x={X(0)} y={Y(garden.depthM) + 30} scale={scale} />
        </G>
      )}
      {!thumbnail && <NorthArrow cx={X(garden.widthM) - 18} cy={Y(garden.depthM) + 32} deg={garden.northDeg} />}
      {tb && <TitleBlock garden={garden} x={X(0)} y={Y(garden.depthM) + 56} w={gw} />}
    </Svg>
  );
}

// Plant names down the right-hand side, each joined to its plant by a leader line.
function PlantLabels({ garden, X, Y, scale, width }: { garden: Garden; X: (m: number) => number; Y: (m: number) => number; scale: number; width: number }) {
  const colX = X(garden.widthM) + 16;
  const items = garden.plants
    .map((p) => ({ p, info: plantById(p.plantId) }))
    .filter((it) => it.info)
    .sort((a, b) => a.p.y - b.p.y);
  // Spread labels so they never overlap, keeping each near its plant's height on the page.
  const gap = 24;
  const ys: number[] = [];
  items.forEach((it, i) => {
    const want = Y(it.p.y);
    ys.push(i === 0 ? Math.max(want, Y(0) + 8) : Math.max(want, ys[i - 1] + gap));
  });
  const overflow = ys.length ? ys[ys.length - 1] - (Y(garden.depthM) - 8) : 0;
  if (overflow > 0) for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i] - overflow, i < ys.length - 1 ? ys[i + 1] - gap : Infinity);
  const maxChars = Math.floor((width - colX - 4) / 5.2);
  const trim = (t: string) => (t.length > maxChars ? t.slice(0, maxChars - 1) + '…' : t);
  return (
    <G>
      {items.map(({ p, info }, i) => {
        const r = Math.max((info!.spreadM / 2) * scale, 4);
        const sx = X(p.x) + r * 0.7, sy = Y(p.y) - r * 0.2;
        const y = ys[i];
        const elbow = X(garden.widthM) + 6;
        return (
          <G key={p.id}>
            <Path d={`M${sx} ${sy} L${elbow} ${y} H${colX - 3}`} stroke={INK} strokeWidth={0.5} fill="none" />
            <Circle cx={sx} cy={sy} r={1.4} fill={INK} />
            <SvgText x={colX} y={y - 1} fontSize={9.5} fill={INK}>{trim(`${info!.commonName}${p.quantity > 1 ? ` ×${p.quantity}` : ''}`)}</SvgText>
            <SvgText x={colX} y={y + 9} fontSize={7.5} fontStyle="italic" fill="#5b625d">{trim(info!.latinName)}</SvgText>
          </G>
        );
      })}
    </G>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// A designer's title strip: brand, drawing name and the key facts about the sheet.
function TitleBlock({ garden, x, y, w }: { garden: Garden; x: number; y: number; w: number }) {
  const h = 42;
  const c1 = w * 0.27, c3 = w * 0.3;
  const c2 = w - c1 - c3;
  const area = garden.widthM * garden.depthM;
  const small = { fontSize: 7.5, fill: '#5b625d', letterSpacing: 0.4 } as const;
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill="#ffffff" stroke={INK} strokeWidth={1.2} />
      <Rect x={x} y={y} width={c1} height={h} fill={INK} />
      <SvgText x={x + c1 / 2} y={y + 21} fontSize={13} fontWeight="700" letterSpacing={2.5} textAnchor="middle" fill="#ffffff">HEDGE</SvgText>
      <SvgText x={x + c1 / 2} y={y + 32} fontSize={6.5} letterSpacing={0.8} textAnchor="middle" fill="#cfd8cf">GARDEN DESIGN</SvgText>
      <Line x1={x + c1 + c2} y1={y} x2={x + c1 + c2} y2={y + h} stroke={INK} strokeWidth={0.6} />
      <SvgText x={x + c1 + 8} y={y + 17} fontSize={11} fontWeight="700" fill={INK}>{garden.title}</SvgText>
      <SvgText x={x + c1 + 8} y={y + 31} {...small}>LAYOUT AND PLANTING PLAN</SvgText>
      <SvgText x={x + c1 + c2 + 7} y={y + 13} {...small}>{`PLOT ${garden.widthM.toFixed(1)} × ${garden.depthM.toFixed(1)} M`}</SvgText>
      <SvgText x={x + c1 + c2 + 7} y={y + 24} {...small}>{`AREA ${area.toFixed(0)} M²`}</SvgText>
      <SvgText x={x + c1 + c2 + 7} y={y + 35} {...small}>{shortDate(garden.createdAt).toUpperCase()}</SvgText>
    </G>
  );
}

function DimLine({ x1, y1, x2, y2, text, vertical }: { x1: number; y1: number; x2: number; y2: number; text: string; vertical?: boolean }) {
  const t = 4;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <G>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={0.8} />
      <Path d={`M${x1 - t} ${y1 + t} L${x1 + t} ${y1 - t} M${x2 - t} ${y2 + t} L${x2 + t} ${y2 - t}`} stroke={INK} strokeWidth={1} />
      {vertical ? (
        <SvgText x={x1 - 6} y={my} fontSize={10} textAnchor="middle" fill={INK} rotation={-90} origin={`${x1 - 6}, ${my}`}>{text}</SvgText>
      ) : (
        <SvgText x={mx} y={y1 - 5} fontSize={10} textAnchor="middle" fill={INK}>{text}</SvgText>
      )}
    </G>
  );
}

function ScaleBar({ x, y, scale }: { x: number; y: number; scale: number }) {
  const n = 4;
  return (
    <G>
      {Array.from({ length: n }, (_, i) => (
        <Rect key={i} x={x + i * scale} y={y - 4} width={scale} height={6} fill={i % 2 ? '#ffffff' : INK} stroke={INK} strokeWidth={0.7} />
      ))}
      {Array.from({ length: n + 1 }, (_, i) => (
        <SvgText key={`t${i}`} x={x + i * scale} y={y + 14} fontSize={9} textAnchor="middle" fill={INK}>{i === n ? `${i} m` : `${i}`}</SvgText>
      ))}
    </G>
  );
}

function NorthArrow({ cx, cy, deg }: { cx: number; cy: number; deg: number }) {
  return (
    <G rotation={deg} origin={`${cx}, ${cy}`}>
      <Circle cx={cx} cy={cy} r={13} fill="#ffffff" stroke={INK} strokeWidth={0.8} />
      <Path d={`M${cx} ${cy - 11} L${cx + 5} ${cy + 7} L${cx} ${cy + 3} Z`} fill={INK} />
      <Path d={`M${cx} ${cy - 11} L${cx - 5} ${cy + 7} L${cx} ${cy + 3} Z`} fill="#ffffff" stroke={INK} strokeWidth={0.7} />
      <SvgText x={cx} y={cy - 16} fontSize={10} fontWeight="700" textAnchor="middle" fill={INK}>N</SvgText>
    </G>
  );
}
