import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import GardenSvg, { PAD, garden2px } from '@/components/GardenSvg';
import { Button, Chip } from '@/components/ui';
import { PLANTS, plantById } from '@/data/plants';
import { centroid } from '@/data/sample';
import { useStore } from '@/data/store';
import type { Feature, Garden, Point } from '@/data/types';
import { colors, radius, space, type } from '@/theme';

const STEP = 0.25; // metres per resize tap
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r2 = (n: number) => Math.round(n * 100) / 100;

function inside(pt: Point, poly: Point[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

const area = (f: Feature) => {
  const xs = f.points.map((p) => p.x), ys = f.points.map((p) => p.y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
};

// Screen 4: Edit plan
export default function EditPlan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getGarden, saveGarden } = useStore();
  const original = getGarden(id);
  const [draft, setDraft] = useState<Garden | undefined>(original);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const { width, height } = useWindowDimensions();

  const drawW = useMemo(() => {
    if (!draft) return 300;
    const maxW = Math.min(width, 560) - space.lg * 2;
    const maxH = height * 0.58;
    const fitW = ((maxH - PAD.top - PAD.bottom) * draft.widthM) / draft.depthM + PAD.left + PAD.right;
    return Math.max(220, Math.min(maxW, fitW));
  }, [draft, width, height]);

  // Refs so the gesture handlers always see the latest state.
  const draftRef = useRef(draft); draftRef.current = draft;
  const drawWRef = useRef(drawW); drawWRef.current = drawW;
  const drag = useRef<{ id: string; start: Garden } | null>(null);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const g = draftRef.current;
      if (!g) return;
      const { scale } = garden2px(g, drawWRef.current);
      const m = { x: (e.nativeEvent.locationX - PAD.left) / scale, y: (e.nativeEvent.locationY - PAD.top) / scale };
      const plant = g.plants.find((p) => {
        const r = Math.max((plantById(p.plantId)?.spreadM ?? 0.5) / 2, 0.35);
        return Math.hypot(p.x - m.x, p.y - m.y) <= r;
      });
      const feature = [...g.features].filter((f) => f.shape === 'polygon' && f.kind !== 'fence')
        .sort((a, b) => area(a) - area(b)).find((f) => inside(m, f.points));
      const hit = plant?.id ?? feature?.id ?? null;
      setSelectedId(hit);
      setSwapping(false);
      drag.current = hit ? { id: hit, start: g } : null;
    },
    onPanResponderMove: (_, gs) => {
      const d = drag.current;
      if (!d) return;
      const { scale } = garden2px(d.start, drawWRef.current);
      setDraft(moveItem(d.start, d.id, gs.dx / scale, gs.dy / scale));
    },
    onPanResponderRelease: () => { drag.current = null; },
    onPanResponderTerminate: () => { drag.current = null; },
  }), []);

  if (!draft || !original) {
    return <View style={styles.page}><Text style={type.body}>This garden isn't here any more.</Text></View>;
  }

  const selPlant = draft.plants.find((p) => p.id === selectedId);
  const selFeature = draft.features.find((f) => f.id === selectedId);
  const update = (g: Garden) => setDraft(g);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.canvasWrap}>
        <View {...pan.panHandlers} style={[styles.canvas, { width: drawW }]}>
          <View pointerEvents="none">
            <GardenSvg garden={draft} width={drawW} mode="plan" selectedId={selectedId} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.panel}>
        {!selPlant && !selFeature && (
          <Text style={type.small}>Tap a bed, path or plant to select it, then drag to move it.</Text>
        )}

        {selFeature && (
          <View style={{ gap: space.sm }}>
            <Text style={type.heading}>{selFeature.label}</Text>
            <Text style={type.small}>{sizeText(selFeature)}</Text>
            <View style={styles.row}>
              <Chip label="Wider" selected={false} onPress={() => update(resize(draft, selFeature.id, STEP, 0))} />
              <Chip label="Narrower" selected={false} onPress={() => update(resize(draft, selFeature.id, -STEP, 0))} />
              <Chip label="Longer" selected={false} onPress={() => update(resize(draft, selFeature.id, 0, STEP))} />
              <Chip label="Shorter" selected={false} onPress={() => update(resize(draft, selFeature.id, 0, -STEP))} />
            </View>
            {(selFeature.kind === 'bed' || selFeature.kind === 'raised_bed') && (
              <Button title="Add a plant here" variant="secondary" onPress={() => {
                const c = centroid(selFeature.points);
                const nid = `P${Date.now()}`;
                update({ ...draft, plants: [...draft.plants, { id: nid, plantId: 'lavender', x: r2(c.x), y: r2(c.y), quantity: 1, featureId: selFeature.id }] });
                setSelectedId(nid);
              }} />
            )}
            <Button title="Delete" variant="danger" onPress={() => {
              update({ ...draft, features: draft.features.filter((f) => f.id !== selFeature.id) });
              setSelectedId(null);
            }} />
          </View>
        )}

        {selPlant && (
          <View style={{ gap: space.sm }}>
            <Text style={type.heading}>{plantById(selPlant.plantId)?.commonName}</Text>
            <View style={[styles.row, { alignItems: 'center' }]}>
              <Text style={type.small}>Quantity</Text>
              <Chip label="−" selected={false} onPress={() => update(setQty(draft, selPlant.id, selPlant.quantity - 1))} />
              <Text style={[type.body, { minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>{selPlant.quantity}</Text>
              <Chip label="+" selected={false} onPress={() => update(setQty(draft, selPlant.id, selPlant.quantity + 1))} />
            </View>
            <View style={styles.row}>
              <Button title="Swap plant" variant="secondary" style={{ flex: 1 }} onPress={() => setSwapping((s) => !s)} />
              <Button title="Details" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/plant/${selPlant.plantId}`)} />
            </View>
            {swapping && (
              <View style={[styles.row, { flexWrap: 'wrap' }]}>
                {PLANTS.map((p) => (
                  <Chip key={p.id} label={p.commonName} selected={p.id === selPlant.plantId} onPress={() => {
                    update({ ...draft, plants: draft.plants.map((x) => (x.id === selPlant.id ? { ...x, plantId: p.id } : x)) });
                    setSwapping(false);
                  }} />
                ))}
              </View>
            )}
            <Button title="Remove plant" variant="danger" onPress={() => {
              update({ ...draft, plants: draft.plants.filter((x) => x.id !== selPlant.id) });
              setSelectedId(null);
            }} />
          </View>
        )}

        <View style={[styles.row, { marginTop: space.md }]}>
          <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => router.back()} />
          <Button title="Save changes" style={{ flex: 1 }} onPress={() => { saveGarden(draft); router.back(); }} />
        </View>
      </ScrollView>
    </View>
  );
}

function moveItem(g: Garden, id: string, dx: number, dy: number): Garden {
  const plant = g.plants.find((p) => p.id === id);
  if (plant) {
    return { ...g, plants: g.plants.map((p) => (p.id === id
      ? { ...p, x: r2(clamp(p.x + dx, 0, g.widthM)), y: r2(clamp(p.y + dy, 0, g.depthM)) } : p)) };
  }
  return {
    ...g,
    features: g.features.map((f) => {
      if (f.id !== id) return f;
      const xs = f.points.map((p) => p.x), ys = f.points.map((p) => p.y);
      const ddx = clamp(dx, -Math.min(...xs), g.widthM - Math.max(...xs));
      const ddy = clamp(dy, -Math.min(...ys), g.depthM - Math.max(...ys));
      const points = f.points.map((p) => ({ x: r2(p.x + ddx), y: r2(p.y + ddy) }));
      return { ...f, points, center: centroid(points) };
    }),
    // Plants move with their bed.
    plants: g.plants.map((p) => (p.featureId === id
      ? { ...p, x: r2(p.x + dx), y: r2(p.y + dy) } : p)),
  };
}

function resize(g: Garden, id: string, dw: number, dd: number): Garden {
  return {
    ...g,
    features: g.features.map((f) => {
      if (f.id !== id) return f;
      const xs = f.points.map((p) => p.x), ys = f.points.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const w = x1 - x0, h = y1 - y0;
      const nw = clamp(w + dw, 0.3, g.widthM), nh = clamp(h + dd, 0.3, g.depthM);
      // Scale every corner about the shape's centre, then keep it inside the garden.
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      let pts = f.points.map((p) => ({ x: cx + ((p.x - cx) * nw) / w, y: cy + ((p.y - cy) * nh) / h }));
      const sx = Math.min(0, g.widthM - Math.max(...pts.map((p) => p.x))) - Math.min(0, Math.min(...pts.map((p) => p.x)));
      const sy = Math.min(0, g.depthM - Math.max(...pts.map((p) => p.y))) - Math.min(0, Math.min(...pts.map((p) => p.y)));
      pts = pts.map((p) => ({ x: r2(p.x + sx), y: r2(p.y + sy) }));
      return { ...f, points: pts, center: centroid(pts) };
    }),
  };
}

const setQty = (g: Garden, id: string, q: number): Garden =>
  ({ ...g, plants: g.plants.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, q) } : p)) });

function sizeText(f: Feature) {
  const xs = f.points.map((p) => p.x), ys = f.points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  return `${w.toFixed(2)} m × ${h.toFixed(2)} m · ${(w * h).toFixed(1)} m²`;
}

const styles = StyleSheet.create({
  page: { padding: space.lg },
  canvasWrap: { alignItems: 'center', paddingTop: space.sm },
  canvas: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  panel: { padding: space.lg, gap: space.md, paddingBottom: space.xxl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
