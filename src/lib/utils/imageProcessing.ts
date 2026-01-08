/**
 * Image processing utilities for value simplification and analysis
 */

import { hexToRgb, findClosestPaletteColor } from './palettes';
import type { ImageData as AppImageData } from '../api/types';
import type { AdjustmentsState, CropBox } from '../stores/imageStore';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorCluster {
  r: number;
  g: number;
  b: number;
  hex: string;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase()}`;
}

/**
 * Get luminosity value (for grayscale conversion)
 */
export function getLuminosity(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Extract dominant colors using k-means clustering
 */
export function extractDominantColors(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  numColors: number = 5,
  sampleRate: number = 4
): ColorCluster[] {
  const pixels: RGBA[] = [];

  // Sample pixels more aggressively for performance
  for (let i = 0; i < imageData.length; i += sampleRate * 4) {
    pixels.push({
      r: imageData[i],
      g: imageData[i + 1],
      b: imageData[i + 2],
      a: imageData[i + 3],
    });
  }

  // Simple k-means clustering with fewer iterations for speed
  let centroids = initCentroids(pixels, numColors);

  // Reduced to 3 iterations for better performance
  for (let iteration = 0; iteration < 3; iteration++) {
    const clusters: RGBA[][] = Array(numColors)
      .fill(null)
      .map(() => []);

    // Assign pixels to nearest centroid
    for (const pixel of pixels) {
      let minDist = Infinity;
      let closestIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = colorDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      clusters[closestIdx].push(pixel);
    }

    // Update centroids
    const newCentroids: RGBA[] = [];
    for (let i = 0; i < numColors; i++) {
      if (clusters[i].length === 0) {
        newCentroids.push(centroids[i]);
      } else {
        const avgR = Math.round(clusters[i].reduce((sum, p) => sum + p.r, 0) / clusters[i].length);
        const avgG = Math.round(clusters[i].reduce((sum, p) => sum + p.g, 0) / clusters[i].length);
        const avgB = Math.round(clusters[i].reduce((sum, p) => sum + p.b, 0) / clusters[i].length);
        newCentroids.push({ r: avgR, g: avgG, b: avgB, a: 255 });
      }
    }

    centroids = newCentroids;
  }

  return centroids.map(c => ({
    r: c.r,
    g: c.g,
    b: c.b,
    hex: rgbToHex(c.r, c.g, c.b),
  }));
}

/**
 * Quantize image to specific number of color levels
 */
export function quantizeImage(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  levels: number
): Uint8ClampedArray {
  const quantized = new Uint8ClampedArray(imageData.length);
  const step = Math.floor(256 / levels);

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    // Quantize each channel
    quantized[i] = Math.round(Math.floor(r / step) * step);
    quantized[i + 1] = Math.round(Math.floor(g / step) * step);
    quantized[i + 2] = Math.round(Math.floor(b / step) * step);
    quantized[i + 3] = a;
  }

  return quantized;
}

/**
 * Apply posterize effect to image (reduce to N colors per channel)
 */
export function posterizeImage(
  imageData: Uint8ClampedArray,
  levels: number
): Uint8ClampedArray {
  const posterized = new Uint8ClampedArray(imageData.length);

  // Reduce to posterize levels (typically 2-8)
  const factor = Math.floor(256 / levels);

  for (let i = 0; i < imageData.length; i += 4) {
    posterized[i] = Math.floor(imageData[i] / factor) * factor;
    posterized[i + 1] = Math.floor(imageData[i + 1] / factor) * factor;
    posterized[i + 2] = Math.floor(imageData[i + 2] / factor) * factor;
    posterized[i + 3] = imageData[i + 3];
  }

  return posterized;
}

/**
 * Helper: Initialize centroids for k-means
 */
function initCentroids(pixels: RGBA[], numColors: number): RGBA[] {
  const centroids: RGBA[] = [];
  const step = Math.floor(pixels.length / numColors);

  for (let i = 0; i < numColors; i++) {
    if (i * step < pixels.length) {
      centroids.push(pixels[i * step]);
    }
  }

  return centroids;
}

/**
 * Helper: Calculate Euclidean distance between two colors
 */
function colorDistance(c1: RGBA, c2: RGBA): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Mix two colors together
 */
function mixColors(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, ratio: number) {
  return {
    r: Math.round(r1 * (1 - ratio) + r2 * ratio),
    g: Math.round(g1 * (1 - ratio) + g2 * ratio),
    b: Math.round(b1 * (1 - ratio) + b2 * ratio),
  };
}

/**
 * Generate expanded palette with tints, shades, and mixes
 * Like a master painter mixing colors on their palette
 */
function generateMixedPalette(paletteHexColors: string[]): Array<{r: number, g: number, b: number, luminosity: number}> {
  const expandedPalette: Array<{r: number, g: number, b: number, luminosity: number}> = [];
  
  // Convert base palette
  const baseColors = paletteHexColors.map(hex => {
    const [r, g, b] = hexToRgb(hex);
    return { r, g, b };
  });
  
  // Add pure palette colors
  baseColors.forEach(color => {
    expandedPalette.push({
      ...color,
      luminosity: getLuminosity(color.r, color.g, color.b)
    });
  });
  
  // Generate tints (mix with white) and shades (mix with black) for each color
  baseColors.forEach(color => {
    // Tints: 25%, 50%, 75% white
    [0.25, 0.5, 0.75].forEach(ratio => {
      const tint = mixColors(color.r, color.g, color.b, 255, 255, 255, ratio);
      expandedPalette.push({
        ...tint,
        luminosity: getLuminosity(tint.r, tint.g, tint.b)
      });
    });
    
    // Shades: 25%, 50%, 75% black
    [0.25, 0.5, 0.75].forEach(ratio => {
      const shade = mixColors(color.r, color.g, color.b, 0, 0, 0, ratio);
      expandedPalette.push({
        ...shade,
        luminosity: getLuminosity(shade.r, shade.g, shade.b)
      });
    });
  });
  
  // Mix adjacent palette colors (like mixing on a palette)
  for (let i = 0; i < baseColors.length; i++) {
    for (let j = i + 1; j < baseColors.length; j++) {
      [0.33, 0.5, 0.66].forEach(ratio => {
        const mix = mixColors(
          baseColors[i].r, baseColors[i].g, baseColors[i].b,
          baseColors[j].r, baseColors[j].g, baseColors[j].b,
          ratio
        );
        expandedPalette.push({
          ...mix,
          luminosity: getLuminosity(mix.r, mix.g, mix.b)
        });
      });
    }
  }
  
  return expandedPalette;
}

/**
 * Remap all image pixels to closest palette colors
 * Uses luminosity-based mapping with mixed colors to preserve value structure and create harmony
 * Simulates how a master painter would mix a limited palette
 */
export function remapImageToPalette(
  imageData: Uint8ClampedArray,
  paletteHexColors: string[]
): Uint8ClampedArray {
  const remapped = new Uint8ClampedArray(imageData.length);
  
  // Generate expanded palette with tints, shades, and mixes
  const expandedPalette = generateMixedPalette(paletteHexColors);
  
  // Sort by luminosity
  expandedPalette.sort((a, b) => a.luminosity - b.luminosity);
  
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    
    // Calculate luminosity and color properties
    const pixelLuminosity = getLuminosity(r, g, b);
    
    // Find best match considering both luminosity and color
    let bestMatch = expandedPalette[0];
    let minScore = Infinity;
    
    for (const paletteColor of expandedPalette) {
      // Weight luminosity heavily (70%) but also consider color distance (30%)
      const luminosityDiff = Math.abs(pixelLuminosity - paletteColor.luminosity);
      const colorDist = Math.sqrt(
        Math.pow(r - paletteColor.r, 2) +
        Math.pow(g - paletteColor.g, 2) +
        Math.pow(b - paletteColor.b, 2)
      );
      
      const score = (luminosityDiff * 1.5) + (colorDist * 0.15);
      
      if (score < minScore) {
        minScore = score;
        bestMatch = paletteColor;
      }
    }
    
    remapped[i] = bestMatch.r;
    remapped[i + 1] = bestMatch.g;
    remapped[i + 2] = bestMatch.b;
    remapped[i + 3] = a;
  }
  
  return remapped;
}

/**
 * Map extracted colors to a palette
 */
export function mapColorsToPalette(
  colors: ColorCluster[],
  paletteColors: string[]
): ColorCluster[] {
  return colors.map(color => ({
    ...color,
    hex: findClosestPaletteColor(color.r, color.g, color.b, paletteColors),
  }));
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function applyToneAdjustments(
  imageData: AppImageData,
  settings: AdjustmentsState
): AppImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const result = new Uint8ClampedArray(data.length);

  const brightnessFactor = 1 + settings.brightness;
  const exposureFactor = Math.pow(2, settings.exposure);
  const contrastFactor = 1 + settings.contrast;
  const saturationFactor = 1 + settings.saturation;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    // Exposure + brightness
    r *= exposureFactor * brightnessFactor;
    g *= exposureFactor * brightnessFactor;
    b *= exposureFactor * brightnessFactor;

    // Contrast around mid-gray
    r = (r - 128) * contrastFactor + 128;
    g = (g - 128) * contrastFactor + 128;
    b = (b - 128) * contrastFactor + 128;

    // Warmth adjustment (tilt red/blue balance)
    if (settings.warmth !== 0) {
      const warmthFactor = 1 + settings.warmth * 0.25;
      r *= warmthFactor;
      b *= 1 / warmthFactor;
    }

    const lum = getLuminosity(r, g, b);

    // Shadows
    if (settings.shadows !== 0 && lum < 128) {
      const shadowFactor = 1 + settings.shadows * (1 - lum / 128);
      r *= shadowFactor;
      g *= shadowFactor;
      b *= shadowFactor;
    }

    // Highlights
    if (settings.highlights !== 0 && lum > 128) {
      const highlightFactor = 1 + settings.highlights * ((lum - 128) / 128);
      r *= highlightFactor;
      g *= highlightFactor;
      b *= highlightFactor;
    }

    // Saturation using perceptual luminance
    if (saturationFactor !== 1) {
      const gray = lum;
      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;
    }

    result[i] = clampByte(r);
    result[i + 1] = clampByte(g);
    result[i + 2] = clampByte(b);
    result[i + 3] = a;
  }

  return {
    ...imageData,
    data: Array.from(result),
  };
}

export function rotateImageData(
  imageData: AppImageData,
  degrees: number
): AppImageData {
  if (typeof document === 'undefined') return imageData;

  const normalized = ((degrees % 360) + 360) % 360;
  if (Math.abs(normalized) < 0.001) return imageData;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return imageData;

  const srcData = new globalThis.ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  srcCtx.putImageData(srcData, 0, 0);

  const radians = (normalized * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const destWidth = Math.max(1, Math.round(imageData.width * cos + imageData.height * sin));
  const destHeight = Math.max(1, Math.round(imageData.width * sin + imageData.height * cos));

  const destCanvas = document.createElement('canvas');
  destCanvas.width = destWidth;
  destCanvas.height = destHeight;
  const destCtx = destCanvas.getContext('2d');
  if (!destCtx) return imageData;

  destCtx.translate(destWidth / 2, destHeight / 2);
  destCtx.rotate(radians);
  destCtx.drawImage(srcCanvas, -imageData.width / 2, -imageData.height / 2);

  const rotated = destCtx.getImageData(0, 0, destWidth, destHeight);
  return {
    width: destWidth,
    height: destHeight,
    format: imageData.format,
    data: Array.from(rotated.data),
  };
}

export function cropImageData(
  imageData: AppImageData,
  crop: CropBox | null
): AppImageData {
  if (!crop) return imageData;
  if (typeof document === 'undefined') return imageData;

  const startX = Math.max(0, Math.floor(crop.x * imageData.width));
  const startY = Math.max(0, Math.floor(crop.y * imageData.height));
  const width = Math.max(1, Math.floor(crop.width * imageData.width));
  const height = Math.max(1, Math.floor(crop.height * imageData.height));
  const safeWidth = Math.min(width, imageData.width - startX);
  const safeHeight = Math.min(height, imageData.height - startY);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = imageData.width;
  sourceCanvas.height = imageData.height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return imageData;

  const sourceData = new globalThis.ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  sourceCtx.putImageData(sourceData, 0, 0);

  const destCanvas = document.createElement('canvas');
  destCanvas.width = safeWidth;
  destCanvas.height = safeHeight;
  const destCtx = destCanvas.getContext('2d');
  if (!destCtx) return imageData;

  destCtx.drawImage(sourceCanvas, -startX, -startY);
  const cropped = destCtx.getImageData(0, 0, safeWidth, safeHeight);

  return {
    width: safeWidth,
    height: safeHeight,
    format: imageData.format,
    data: Array.from(cropped.data),
  };
}

export function applyAdjustments(
  imageData: AppImageData,
  settings: AdjustmentsState,
  options: { applyCrop?: boolean } = {}
): AppImageData {
  let working = applyToneAdjustments(imageData, settings);

  if (Math.abs(settings.rotation % 360) > 0.001) {
    working = rotateImageData(working, settings.rotation);
  }

  if (options.applyCrop && settings.crop) {
    working = cropImageData(working, settings.crop);
  }

  return working;
}