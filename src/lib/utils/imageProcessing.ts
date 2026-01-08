/**
 * Image processing utilities for value simplification and analysis
 */

import { hexToRgb, findClosestPaletteColor } from './palettes';

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