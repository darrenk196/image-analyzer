export interface ImageData {
  width: number;
  height: number;
  data: number[];
  format: string;
}

export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminosity: number[];
}

export interface ColorSample {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export interface AnalysisResult {
  histogram: HistogramData;
  dominant_colors: ColorSample[];
  average_brightness: number;
  contrast: number;
}
