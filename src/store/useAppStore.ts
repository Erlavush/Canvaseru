import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CanvasMeta, Theme } from '../types/canvas';
import { uid } from '../utils/uid';

interface AppState {
  theme: Theme;
  canvases: CanvasMeta[];
  toggleTheme: () => void;
  createCanvas: () => string;           // returns new canvas id
  deleteCanvas: (id: string) => void;
  renameCanvas: (id: string, title: string) => void;
  updateThumbnail: (id: string, thumbnail: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      canvases: [],

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        document.documentElement.setAttribute('data-theme', next);
      },

      createCanvas: () => {
        const id = uid('canvas');
        const meta: CanvasMeta = {
          id,
          title: 'Untitled Canvas',
          updatedAt: Date.now(),
        };
        set(s => ({ canvases: [meta, ...s.canvases] }));
        return id;
      },

      deleteCanvas: (id) =>
        set(s => ({ canvases: s.canvases.filter(c => c.id !== id) })),

      renameCanvas: (id, title) =>
        set(s => ({
          canvases: s.canvases.map(c =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        })),

      updateThumbnail: (id, thumbnail) =>
        set(s => ({
          canvases: s.canvases.map(c =>
            c.id === id ? { ...c, thumbnail, updatedAt: Date.now() } : c
          ),
        })),
    }),
    { name: 'canvaseru-app' }
  )
);
