// Mirrors prototype/sketch-to-plan/layout.py. Everything is in metres.
// (0, 0) is the top-left corner of the garden; x grows right, y grows down.

export type Point = { x: number; y: number };

export type FeatureKind =
  | 'lawn' | 'bed' | 'raised_bed' | 'path' | 'patio' | 'decking' | 'pond'
  | 'shed' | 'greenhouse' | 'fence' | 'hedge' | 'wall' | 'water_butt'
  | 'compost' | 'seating' | 'house' | 'other';

export type Feature = {
  id: string;
  kind: FeatureKind;
  label: string;
  shape: 'polygon' | 'circle';
  points: Point[];
  center: Point;
  radius_m: number;
  material: string;
};

export type PlacedPlant = {
  id: string;
  plantId: string; // key into the plant library
  x: number;
  y: number;
  quantity: number;
  featureId: string;
};

// Garden furniture drawn on the plan. x, y is the centre; rotDeg turns it clockwise.
export type FurnitureKind =
  | 'dining_set' | 'bistro_set' | 'bench' | 'lounger' | 'sofa' | 'fire_pit' | 'pot';

export type Furniture = {
  id: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  rotDeg: number;
  seats: number; // dining_set and bistro_set only; 0 otherwise
};

export type Aspect = 'North' | 'East' | 'South' | 'West';

export type Garden = {
  id: string;
  title: string;
  createdAt: string;
  widthM: number;
  depthM: number;
  northDeg: number;
  aspect: Aspect;
  sketchUri: string | null;
  features: Feature[];
  plants: PlacedPlant[];
  furniture?: Furniture[];
  assumptions: string[];
};
