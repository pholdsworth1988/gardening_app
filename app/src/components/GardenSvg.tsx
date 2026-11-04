import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { plantById } from '@/data/plants';
import type { Feature, Garden } from '@/data/types';

export type Mode = 'plan' | 'concept';

// Padding around the garden for dimensions, scale bar and north arrow.
export const PAD = { left: 40, top: 34, right: 14, bottom: 58 };

export function garden2px(garden: Garden, width: number) {
  const scale = (width - PAD.left - PAD.right) / garden.widthM; // px per metre
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
};

export default function GardenSvg({ garden, width, mode, selectedId, showNumbers = true, thumbnail = false }: Props) {
  const { scale, height, X, Y } = garden2px(garden, width);
  const plan = mode === 'plan';
  const gw = garden.widthM * scale;
  const gh = garden.depthM * scale;
  const order = ['lawn', 'path', 'patio', 'decking', 'bed', 'raised_bed', 'pond', 'hedge'];
  // Ground surfaces first so structures sit on top; unknown kinds last.
  const rank = (f: Feature) => (order.includes(f.kind) ? order.indexOf(f.kind) : order.length);
  const feats = [...garden.features].sort((a, b) => rank(a) - rank(b));

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fontFamily={FONT}>
      <Rect x={0} y={0} width={width} height={height} fill={plan ? '#ffffff' : '#f3f0e6'} />

      {/* 1 m grid on the plan */}
      {plan && (
        <G>
          {Array.from({ length: Math.floor(garden.widthM) + 1 }, (_, i) => (
            <Line key={`gx${i}`} x1={X(i)} y1={Y(0)} x2={X(i)} y2={Y(garden.depthM)} stroke="#e6e9e6" strokeWidth={0.6} />
          ))}
          {Array.from({ length: Math.floor(garden.depthM) + 1 }, (_, j) => (
            <Line key={`gy${j}`} x1={X(0)} y1={Y(j)} x2={X(garden.widthM)} y2={Y(j)} stroke="#e6e9e6" strokeWidth={0.6} />
          ))}
        </G>
      )}

      {!plan && <Rect x={X(0)} y={Y(0)} width={gw} height={gh} fill="#b7cf9f" />}

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
        return (
          <G key={f.id}>
            <Polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />
            {plan && (f.kind === 'shed' || f.kind === 'house') && <Hatch f={f} X={X} Y={Y} />}
            {plan && f.kind === 'patio' && <Paving f={f} X={X} Y={Y} scale={scale} />}
          </G>
        );
      })}

      {/* Plants */}
      {garden.plants.map((p, i) => {
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
            <Circle cx={cx} cy={cy} r={r} fill="#b9d3a8" fillOpacity={0.6} stroke={selected ? '#2f5d3a' : '#4e6b45'} strokeWidth={selected ? 3 : 0.9} />
            <Path d={`M${cx - 3} ${cy} H${cx + 3} M${cx} ${cy - 3} V${cy + 3}`} stroke="#4e6b45" strokeWidth={0.8} />
            {showNumbers && (
              <G>
                <Circle cx={cx + r * 0.7} cy={cy - r * 0.7} r={7.5} fill="#ffffff" stroke={INK} strokeWidth={0.8} />
                <SvgText x={cx + r * 0.7} y={cy - r * 0.7 + 3.4} fontSize={9} textAnchor="middle" fill={INK}>{i + 1}</SvgText>
              </G>
            )}
          </G>
        );
      })}

      {/* Labels */}
      {!thumbnail && feats.filter((f) => f.kind !== 'fence' && f.kind !== 'wall').map((f) => {
        const common = {
          x: X(f.center.x), y: Y(f.center.y) + 4, fontSize: plan ? 10 : 11,
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

      {plan && (
        <G>
          <DimLine x1={X(0)} y1={Y(0) - 18} x2={X(garden.widthM)} y2={Y(0) - 18} text={`${garden.widthM.toFixed(2)} m`} />
          <DimLine x1={X(0) - 22} y1={Y(0)} x2={X(0) - 22} y2={Y(garden.depthM)} text={`${garden.depthM.toFixed(2)} m`} vertical />
          <ScaleBar x={X(0)} y={Y(garden.depthM) + 30} scale={scale} />
        </G>
      )}
      {!thumbnail && <NorthArrow cx={X(garden.widthM) - 18} cy={Y(garden.depthM) + 32} deg={garden.northDeg} />}
    </Svg>
  );
}

function Hatch({ f, X, Y }: { f: Feature; X: (m: number) => number; Y: (m: number) => number }) {
  const xs = f.points.map((p) => X(p.x));
  const ys = f.points.map((p) => Y(p.y));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const lines = [];
  for (let k = -(y1 - y0); k < x1 - x0; k += 8) {
    const ax = Math.max(x0, x0 + k);
    const ay = y0 + Math.max(0, -k);
    const len = Math.min(x1 - ax, y1 - ay);
    lines.push(<Line key={k} x1={ax} y1={ay} x2={ax + len} y2={ay + len} stroke="#8a8f89" strokeWidth={0.7} />);
  }
  return <G>{lines}</G>;
}

function Paving({ f, X, Y, scale }: { f: Feature; X: (m: number) => number; Y: (m: number) => number; scale: number }) {
  const xs = f.points.map((p) => X(p.x));
  const ys = f.points.map((p) => Y(p.y));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const step = 0.6 * scale; // 600 mm slabs
  const lines = [];
  for (let y = y0 + step, row = 0; y < y1; y += step, row++) {
    lines.push(<Line key={`r${row}`} x1={x0} y1={y} x2={x1} y2={y} stroke="#c2bfb5" strokeWidth={0.6} />);
  }
  for (let x = x0 + step, c = 0; x < x1; x += step, c++) {
    lines.push(<Line key={`c${c}`} x1={x} y1={y0} x2={x} y2={y1} stroke="#c2bfb5" strokeWidth={0.6} />);
  }
  return <G>{lines}</G>;
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
