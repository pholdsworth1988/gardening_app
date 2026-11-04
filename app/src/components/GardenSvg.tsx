import Svg, { Circle, ClipPath, Defs, G, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { plantById } from '@/data/plants';
import { FurnitureSymbol, PALETTE, PlantSymbol, Surface } from './planStyle';
import type { Feature, Garden } from '@/data/types';

export type Mode = 'plan' | 'concept';

// Padding around the garden for dimensions, scale bar and north arrow.
export const PAD = { left: 40, top: 34, right: 14, bottom: 58 };

export const LABEL_COL = 100; // width of each side column of leader-line labels
export const ANNOTATE_MIN_W = 500; // annotated sheets are laid out at least this wide, then scaled to fit

export function garden2px(garden: Garden, width: number, annotate = false) {
  const left = annotate ? LABEL_COL + 22 : PAD.left;
  const right = annotate ? LABEL_COL + 6 : PAD.right;
  const scale = (width - left - right) / garden.widthM; // px per metre
  return {
    scale,
    height: garden.depthM * scale + PAD.top + PAD.bottom,
    X: (m: number) => left + m * scale,
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
  annotate?: boolean; // leader-line labels down both sides, like a designer's sheet
  titleBlock?: boolean; // designer's title strip under the plan
};

const TB_H = 52; // extra height for the title block

export default function GardenSvg({ garden, width: displayW, mode, selectedId, showNumbers = true, thumbnail = false, annotate = false, titleBlock = false }: Props) {
  const plan = mode === 'plan';
  const notes = plan && annotate && !thumbnail;
  // An annotated sheet needs room for its label columns, so it is laid out wider and scaled down.
  const width = notes ? Math.max(displayW, ANNOTATE_MIN_W) : displayW;
  const tb = plan && titleBlock && !thumbnail;
  const base = garden2px(garden, width, notes);
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
    <Svg width={displayW} height={(height * displayW) / width} viewBox={`0 0 ${width} ${height}`} fontFamily={FONT}>
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
            {info && <PlantSymbol info={info} id={p.id} cx={cx} cy={cy} quantity={p.quantity} scale={scale} selected={selected} />}
          </G>
        );
      })}

      {/* Number tags last, so taller plants never hide them */}
      {plan && showNumbers && !notes && garden.plants.map((p, i) => {
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
      {!thumbnail && !notes && feats.filter((f) => f.label && f.kind !== 'fence' && f.kind !== 'wall').map((f) => {
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
      {notes && <Callouts garden={garden} X={X} Y={Y} scale={scale} width={width} />}

      {plan && (
        <G>
          <DimLine x1={X(0)} y1={Y(0) - 18} x2={X(garden.widthM)} y2={Y(0) - 18} text={notes ? `${garden.widthM.toFixed(2)} m × ${garden.depthM.toFixed(2)} m deep` : `${garden.widthM.toFixed(2)} m`} />
          {/* On a labelled sheet the side columns hold notes, so depth is given by the ticks, scale bar and title block */}
          {!notes && <DimLine x1={X(0) - 22} y1={Y(0)} x2={X(0) - 22} y2={Y(garden.depthM)} text={`${garden.depthM.toFixed(2)} m`} vertical />}
          <ScaleBar x={X(0)} y={Y(garden.depthM) + 30} scale={scale} />
        </G>
      )}
      {!thumbnail && <NorthArrow cx={X(garden.widthM) - 18} cy={Y(garden.depthM) + 32} deg={garden.northDeg} />}
      {tb && <TitleBlock garden={garden} x={notes ? 8 : X(0)} y={Y(garden.depthM) + 56} w={notes ? width - 16 : gw} />}
    </Svg>
  );
}

const FURNITURE_NAMES: Record<string, string> = {
  dining_set: 'Dining table', bistro_set: 'Bistro table', bench: 'Timber bench', lounger: 'Sun lounger',
  sofa: 'Outdoor sofa', fire_pit: 'Fire pit', pot: 'Planted pot',
};
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type Callout = { ax: number; ay: number; title: string; sub: string; italic: boolean };

// Labels down both sides of the sheet, each joined to its item by a fine leader line,
// as on a designer's hand-lettered plan. Items on the left half go to the left column.
function Callouts({ garden, X, Y, scale, width }: { garden: Garden; X: (m: number) => number; Y: (m: number) => number; scale: number; width: number }) {
  const midX = X(garden.widthM / 2);
  const items: Callout[] = [];
  garden.features.forEach((f) => {
    if (f.kind === 'fence' || f.kind === 'wall' || (f.kind === 'bed' && !f.label)) return;
    const stones = f.material === 'stepping_stones';
    const title = stones ? 'Stepping-stone path' : f.label;
    if (!title) return;
    const c = stones ? f.points[Math.floor(f.points.length / 2)] : f.center;
    // Anchor on the item's edge nearest its label column, so leaders stay short.
    const toLeft = X(c.x) < midX;
    let a = c;
    if (!stones) {
      // Where a level line through the middle crosses the shape's outline, on the label's side.
      const xs: number[] = [];
      f.points.forEach((p, i) => {
        const q = f.points[(i + 1) % f.points.length];
        if ((p.y <= c.y) !== (q.y <= c.y)) xs.push(p.x + ((c.y - p.y) * (q.x - p.x)) / (q.y - p.y));
      });
      const ex = xs.length ? (toLeft ? Math.min(...xs) : Math.max(...xs)) : c.x;
      a = { x: ex + (toLeft ? 0.25 : -0.25), y: c.y };
    }
    const mat = f.material && !stones && !title.toLowerCase().includes(f.material) ? cap(f.material) : '';
    items.push({ ax: X(a.x), ay: Y(a.y), title, sub: mat, italic: false });
  });
  (garden.furniture ?? []).forEach((it) => {
    const name = FURNITURE_NAMES[it.kind] ?? cap(it.kind);
    items.push({ ax: X(it.x), ay: Y(it.y), title: name, sub: it.seats ? `${it.seats} chairs` : '', italic: false });
  });
  garden.plants.forEach((p) => {
    const info = plantById(p.plantId);
    if (!info) return;
    const r = Math.max((info.spreadM / 2) * scale, 4);
    const toLeft = X(p.x) < midX;
    items.push({ ax: X(p.x) + (toLeft ? -r * 0.4 : r * 0.4), ay: Y(p.y), title: `${info.commonName}${p.quantity > 1 ? ` ×${p.quantity}` : ''}`, sub: info.latinName, italic: true });
  });

  const top = Y(0) + 4, bottom = Y(garden.depthM) - 2;
  const sides = [items.filter((i) => i.ax < midX), items.filter((i) => i.ax >= midX)];
  const maxChars = Math.floor(LABEL_COL / 4.1);
  const trim = (t: string) => (t.length > maxChars ? t.slice(0, maxChars - 1) + '…' : t);

  return (
    <G>
      {sides.map((list, side) => {
        list.sort((a, b) => a.ay - b.ay);
        const hOf = (c: Callout) => (c.sub ? 19 : 11);
        const need = list.reduce((s, c) => s + hOf(c), 0);
        const squeeze = Math.min(1, (bottom - top) / Math.max(need, 1));
        // Place each label as near its item as it can go without overlapping the one above.
        const ys: number[] = [];
        list.forEach((c, i) => {
          const want = c.ay - 4;
          ys.push(i === 0 ? Math.max(want, top) : Math.max(want, ys[i - 1] + hOf(list[i - 1]) * squeeze));
        });
        for (let i = list.length - 1; i >= 0; i--) {
          const limit = i === list.length - 1 ? bottom - hOf(list[i]) * squeeze : ys[i + 1] - hOf(list[i]) * squeeze;
          if (ys[i] > limit) ys[i] = limit;
        }
        const left = side === 0;
        const colEdge = left ? X(0) - 16 : X(garden.widthM) + 6;
        const textX = left ? colEdge - 3 : colEdge + 3;
        const anchor = left ? 'end' : 'start';
        return list.map((c, i) => {
          const y = ys[i] + 4;
          return (
            <G key={`${side}-${i}`}>
              <Line x1={c.ax} y1={c.ay} x2={colEdge} y2={y} stroke={INK} strokeWidth={0.45} />
              <Circle cx={c.ax} cy={c.ay} r={1.3} fill={INK} />
              <SvgText x={textX} y={y + 2.5} fontSize={8} textAnchor={anchor} fill={INK}>{trim(c.title)}</SvgText>
              {c.sub ? <SvgText x={textX} y={y + 11} fontSize={6.8} fontStyle={c.italic ? 'italic' : 'normal'} textAnchor={anchor} fill="#4a4f4b">{trim(c.sub)}</SvgText> : null}
            </G>
          );
        });
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
