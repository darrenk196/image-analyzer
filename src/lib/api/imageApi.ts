import type { ImageData, HistogramData, AnalysisResult } from './types';
import { invoke } from '@tauri-apps/api/core';

export async function loadImage(path: string): Promise<ImageData> {
  return invoke('load_image', { path });
}

export async function analyzeImage(imageData: ImageData): Promise<AnalysisResult> {
  return invoke('analyze_image', { imageData });
}

export async function adjustBrightness(
  imageData: ImageData,
  amount: number
): Promise<ImageData> {
  return invoke('adjust_brightness', { imageData, amount });
}

export async function adjustContrast(
  imageData: ImageData,
  amount: number
): Promise<ImageData> {
  return invoke('adjust_contrast', { imageData, amount });
}

export async function convertToGrayscale(imageData: ImageData): Promise<ImageData> {
  return invoke('convert_to_grayscale', { imageData });
}

export async function saveImage(imageData: ImageData, path: string): Promise<void> {
  return invoke('save_image', { imageData, path });
}
