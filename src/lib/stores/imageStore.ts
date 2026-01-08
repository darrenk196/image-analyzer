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
  activeTool: 'none' | 'value-simplification' | 'grid' | 'measure' | 'color-picker';
  valueSimplification: {
    enabled: boolean;
    levels: number;
    opacity: number;
    extractedColors: Array<{ r: number; g: number; b: number; hex: string }>;
    paintByNumbersEnabled: boolean;
    paintByNumbersMode: 'lines' | 'blocks';
    paletteEnabled: boolean;
    selectedPalette: string; // Key from palettes object
  };
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
  activeTool: 'none',
  valueSimplification: {
    enabled: false,
    levels: 5,
    opacity: 1,
    extractedColors: [],
    paintByNumbersEnabled: false,
    paintByNumbersMode: 'blocks' as const,
    paletteEnabled: false,
    selectedPalette: 'zorn',
  },
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
    setActiveTool: (tool: ImageStore['activeTool']) =>
      update((state) => ({ ...state, activeTool: tool })),
    setValueSimplificationEnabled: (enabled: boolean) =>
      update((state) => ({
        ...state,
        valueSimplification: { ...state.valueSimplification, enabled },
      })),
    setValueSimplificationLevels: (levels: number) =>
      update((state) => ({
        ...state,
        valueSimplification: { ...state.valueSimplification, levels },
      })),
    setValueSimplificationOpacity: (opacity: number) =>
      update((state) => ({
        ...state,
        valueSimplification: { ...state.valueSimplification, opacity },
      })),
    setExtractedColors: (colors: Array<{ r: number; g: number; b: number; hex: string }>) =>
      update((state) => ({
        ...state,
        valueSimplification: { ...state.valueSimplification, extractedColors: colors },
      })),
    setPaintByNumbersEnabled: (enabled: boolean) =>
      update((state) => ({
        ...state,
        valueSimplification: { ...state.valueSimplification, paintByNumbersEnabled: enabled },
      })),
    setPaintByNumbersMode: (mode: 'lines' | 'blocks') =>
      update((state) => ({
        ...state,
        valueSimplification: { ...state.valueSimplification, paintByNumbersMode: mode },
      })),
    setPaletteEnabled: (enabled: boolean) =>
      update((state) => ({
        ...state,
        valueSimplification: { ...state.valueSimplification, paletteEnabled: enabled },
      })),
    setSelectedPalette: (paletteKey: string) =>
      update((state) => ({
        ...state,
        valueSimplification: { ...state.valueSimplification, selectedPalette: paletteKey },
      })),
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
