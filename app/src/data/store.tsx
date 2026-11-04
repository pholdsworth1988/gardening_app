import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { SAMPLE_GARDEN } from './sample';
import type { Garden } from './types';

// In-memory store for the proof of concept. Saving to the phone comes in a later step.

type Store = {
  gardens: Garden[];
  getGarden: (id: string) => Garden | undefined;
  saveGarden: (g: Garden) => void;
  deleteGarden: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [gardens, setGardens] = useState<Garden[]>([SAMPLE_GARDEN]);
  const value = useMemo<Store>(() => ({
    gardens,
    getGarden: (id) => gardens.find((g) => g.id === id),
    saveGarden: (g) =>
      setGardens((all) => (all.some((x) => x.id === g.id) ? all.map((x) => (x.id === g.id ? g : x)) : [g, ...all])),
    deleteGarden: (id) => setGardens((all) => all.filter((g) => g.id !== id)),
  }), [gardens]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
