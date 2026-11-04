// Starter plant list for the proof of concept. A full database comes later.

export type Sun = 'Full sun' | 'Part shade' | 'Shade';
export type Water = 'Low' | 'Medium' | 'High';

export type PlantInfo = {
  id: string;
  commonName: string;
  latinName: string;
  type: 'Tree' | 'Shrub' | 'Perennial' | 'Climber' | 'Herb' | 'Grass';
  spreadM: number;
  heightM: number;
  sun: Sun[];
  water: Water;
  spacingM: number;
  flowering: string;
  note: string;
  colour: string; // symbol colour on the concept view
};

export const PLANTS: PlantInfo[] = [
  { id: 'acer', commonName: 'Japanese maple', latinName: 'Acer palmatum', type: 'Tree', spreadM: 2.0, heightM: 3.0, sun: ['Part shade'], water: 'Medium', spacingM: 2.5, flowering: 'Grown for leaves; red in autumn', note: 'Shelter from strong wind and hot afternoon sun.', colour: '#b5523b' },
  { id: 'lavender', commonName: 'Lavender', latinName: "Lavandula angustifolia 'Hidcote'", type: 'Shrub', spreadM: 0.6, heightM: 0.6, sun: ['Full sun'], water: 'Low', spacingM: 0.45, flowering: 'June to August, purple', note: 'Trim after flowering to keep it compact.', colour: '#8a74b8' },
  { id: 'geranium', commonName: 'Hardy geranium', latinName: "Geranium 'Rozanne'", type: 'Perennial', spreadM: 0.8, heightM: 0.5, sun: ['Full sun', 'Part shade'], water: 'Medium', spacingM: 0.6, flowering: 'June to October, violet blue', note: 'Very long flowering and easy to grow.', colour: '#6f7fc4' },
  { id: 'rose', commonName: 'Climbing rose', latinName: "Rosa 'Gertrude Jekyll'", type: 'Climber', spreadM: 1.2, heightM: 2.5, sun: ['Full sun'], water: 'Medium', spacingM: 1.5, flowering: 'June to September, pink, scented', note: 'Tie in to a fence or trellis as it grows.', colour: '#d0708f' },
  { id: 'catmint', commonName: 'Catmint', latinName: 'Nepeta x faassenii', type: 'Perennial', spreadM: 0.7, heightM: 0.5, sun: ['Full sun'], water: 'Low', spacingM: 0.45, flowering: 'May to September, lilac', note: 'Cut back after the first flush for more flowers.', colour: '#9a8cc9' },
  { id: 'rosemary', commonName: 'Rosemary', latinName: 'Salvia rosmarinus', type: 'Herb', spreadM: 0.9, heightM: 1.0, sun: ['Full sun'], water: 'Low', spacingM: 0.9, flowering: 'Spring, pale blue', note: 'Needs free-draining soil.', colour: '#5f8a6a' },
  { id: 'hosta', commonName: 'Hosta', latinName: "Hosta 'Sum and Substance'", type: 'Perennial', spreadM: 0.9, heightM: 0.7, sun: ['Part shade', 'Shade'], water: 'High', spacingM: 0.9, flowering: 'Summer, pale lilac', note: 'Protect from slugs in spring.', colour: '#9cbf5a' },
  { id: 'fern', commonName: 'Soft shield fern', latinName: 'Polystichum setiferum', type: 'Perennial', spreadM: 0.8, heightM: 0.6, sun: ['Shade', 'Part shade'], water: 'Medium', spacingM: 0.6, flowering: 'No flowers; evergreen fronds', note: 'Good for dry shade once settled.', colour: '#4f7a4c' },
  { id: 'grass', commonName: 'Mexican feather grass', latinName: 'Stipa tenuissima', type: 'Grass', spreadM: 0.4, heightM: 0.6, sun: ['Full sun'], water: 'Low', spacingM: 0.4, flowering: 'Summer, buff plumes', note: 'Comb out dead growth in spring.', colour: '#c9b26b' },
  { id: 'salvia', commonName: 'Salvia', latinName: "Salvia nemorosa 'Caradonna'", type: 'Perennial', spreadM: 0.5, heightM: 0.6, sun: ['Full sun'], water: 'Low', spacingM: 0.45, flowering: 'June to September, deep purple', note: 'Loved by bees.', colour: '#6a4f9e' },
  { id: 'hydrangea', commonName: 'Hydrangea', latinName: "Hydrangea macrophylla", type: 'Shrub', spreadM: 1.5, heightM: 1.5, sun: ['Part shade'], water: 'High', spacingM: 1.5, flowering: 'July to September, blue or pink', note: 'Flower colour depends on soil acidity.', colour: '#7ea6d6' },
  { id: 'thyme', commonName: 'Thyme', latinName: 'Thymus vulgaris', type: 'Herb', spreadM: 0.3, heightM: 0.2, sun: ['Full sun'], water: 'Low', spacingM: 0.3, flowering: 'Early summer, pink', note: 'Good between paving stones.', colour: '#a88fb0' },
];

export const plantById = (id: string) => PLANTS.find((p) => p.id === id);
