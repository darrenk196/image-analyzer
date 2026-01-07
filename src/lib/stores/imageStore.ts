import { writable, derived } from 'svelte/store';
import type { ImageData, AnalysisResult } from '../api/types';

export interface ImageStore {
  current: ImageData | null;
  history: ImageData[];
  historyIndex: number;
  isProcessing: boolean;
  analysis: AnalysisResult | null;
  brightness: number;
  contrast: number;
  saturations: number;
}

const initialState: ImageStore = {
  current: null,
  history: [],
  historyIndex: -1,
  isProcessing: false,
  analysis: null,
  brightness: 1,
  contrast: 1,
  saturations: 1,
};

function createImageStore() {
  const { subscribe, set, update } = writable<ImageStore>(initialState);

  return {
    subscribe,
    setImage: (image: ImageData) =>
      update((state) => ({
        ...state,
        current: image,
        history: [...state.history, image],
        historyIndex: state.history.length,
      })),
    setAnalysis: (analysis: AnalysisResult) =>
      update((state) => ({ ...state, analysis })),
    setProcessing: (isProcessing: boolean) =>
      update((state) => ({ ...state, isProcessing })),
    setBrightness: (brightness: number) =>
      update((state) => ({ ...state, brightness })),
    setContrast: (contrast: number) => update((state) => ({ ...state, contrast })),
    setSaturation: (saturations: number) =>
      update((state) => ({ ...state, saturations })),
    undo: () =>
      update((state) => {
        if (state.historyIndex > 0) {
          return {
            ...state,
            historyIndex: state.historyIndex - 1,
            current: state.history[state.historyIndex - 1],
          };
        }
        return state;
      }),
    redo: () =>
      update((state) => {
        if (state.historyIndex < state.history.length - 1) {
          return {
            ...state,
            historyIndex: state.historyIndex + 1,
            current: state.history[state.historyIndex + 1],
          };
        }
        return state;
      }),
    reset: () => set(initialState),
  };
}

export const imageStore = createImageStore();

// Derived stores for selectors
export const currentImage = derived(imageStore, ($store) => $store.current);
export const analysis = derived(imageStore, ($store) => $store.analysis);
export const isProcessing = derived(imageStore, ($store) => $store.isProcessing);
