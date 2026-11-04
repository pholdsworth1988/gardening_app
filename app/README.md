# Hedge app (proof of concept)

React Native app built with Expo SDK 56 and Expo Router. It runs on iPhone, Android and the web.

## The five screens

| Screen | File | What it does |
| --- | --- | --- |
| My gardens | `src/app/index.tsx` | Saved gardens and a button to start a new one |
| New garden | `src/app/new.tsx` | Photo of a sketch, garden size and which way it faces |
| Your design | `src/app/design/[id].tsx` | Concept view and technical plan, plant schedule, notes |
| Edit plan | `src/app/edit/[id].tsx` | Drag beds, paths and plants; resize; swap, add and remove plants |
| Plant details | `src/app/plant/[id].tsx` | Size, spacing, light, water, flowering and similar plants |

## What is sample data for now

- Reading the sketch: `src/data/sample.ts` returns a sample layout scaled to the size entered.
  The real step is the Claude API call in `../prototype/sketch-to-plan/sketch_to_layout.py`,
  which returns the same layout shape (`src/data/types.ts`).
- Concept view: a coloured illustration drawn from the plan. A realistic picture needs an image model.
- Saving: gardens are kept in memory until the app closes.
- Plants: a starter list of 12 in `src/data/plants.ts`.

## Running it

```bash
npm install
npx expo start        # scan the QR code with Expo Go on your phone
npm run typecheck
npm run export:web    # web build in dist/
python3 scripts/make_preview.py dist preview.html   # one-file web preview
```
