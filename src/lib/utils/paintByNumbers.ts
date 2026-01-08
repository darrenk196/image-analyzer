/**
 * Paint-by-numbers guide generation with clean, simplified contours
 */

/**
 * Ramer-Douglas-Peucker algorithm for contour simplification
 * Reduces jagged lines to smooth, readable contours
 */
function simplifyContour(points: [number, number][], epsilon: number = 2): [number, number][] {
  if (points.length < 3) return points;

  // Find the point with maximum distance from line
  let maxDistance = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = simplifyContour(points.slice(0, index + 1), epsilon);
    const right = simplifyContour(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Trace contour of a region using Moore-Neighbor tracing for smooth lines
 */
function traceContour(
  region: Set<string>,
  width: number,
  height: number,
  startX: number,
  startY: number
): [number, number][] {
  const contour: [number, number][] = [];

  if (region.size < 3) {
    return contour; // Skip very small regions
  }

  const visited = new Set<string>();

  let x = startX;
  let y = startY;
  let direction = 0; // Start going right

  const directions = [
    [1, 0],   // right
    [1, -1],  // up-right
    [0, -1],  // up
    [-1, -1], // up-left
    [-1, 0],  // left
    [-1, 1],  // down-left
    [0, 1],   // down
    [1, 1],   // down-right
  ];

  const startKey = `${x},${y}`;
  const maxIterations = Math.min(region.size * 2, 10000); // Prevent infinite loops
  let iterations = 0;

  do {
    contour.push([x, y]);
    visited.add(`${x},${y}`);

    // Find next boundary pixel
    let found = false;

    for (let i = 0; i < 8; i++) {
      const checkDir = (direction + i) % 8;
      const [dx, dy] = directions[checkDir];
      const nx = x + dx;
      const ny = y + dy;
      const neighborKey = `${nx},${ny}`;

      // Check if neighbor is in region and is a boundary
      if (region.has(neighborKey)) {
        // Check if it has a neighbor outside the region
        let isBoundary = false;
        for (const [bdx, bdy] of directions) {
          const bx = nx + bdx;
          const by = ny + bdy;
          const bKey = `${bx},${by}`;
          if (bx < 0 || bx >= width || by < 0 || by >= height || !region.has(bKey)) {
            isBoundary = true;
            break;
          }
        }

        if (isBoundary) {
          x = nx;
          y = ny;
          direction = checkDir;
          found = true;
          break;
        }
      }
    }

    if (!found) break;
    iterations++;
  } while (
    `${x},${y}` !== startKey &&
    iterations < maxIterations &&
    contour.length < region.size
  );

  // Only return contour if we traced a reasonable path
  return contour.length > 3 ? simplifyContour(contour, 2.5) : [];
}

/**
 * Find all contiguous regions using connected components
 */
function findRegions(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  minRegionSize: number = 50
): Map<number, Set<string>> {
  const visited = new Set<string>();
  const regions = new Map<number, Set<string>>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const idx = (y * width + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];

      // Flood fill to find region
      const region = floodFillRegion(
        imageData,
        width,
        height,
        x,
        y,
        r,
        g,
        b,
        visited
      );

      // Only keep regions above minimum size (filter noise)
      if (region.size > minRegionSize) {
        const regionId = regions.size;
        regions.set(regionId, region);
      }
    }
  }

  return regions;
}

/**
 * Flood fill to find connected region of same color
 */
function floodFillRegion(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  targetR: number,
  targetG: number,
  targetB: number,
  visited: Set<string>
): Set<string> {
  const region = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];
  const tolerance = 5;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = (y * width + x) * 4;
    const r = imageData[idx];
    const g = imageData[idx + 1];
    const b = imageData[idx + 2];

    // Check if color matches
    if (
      Math.abs(r - targetR) > tolerance ||
      Math.abs(g - targetG) > tolerance ||
      Math.abs(b - targetB) > tolerance
    ) {
      continue;
    }

    visited.add(key);
    region.add(key);

    // Add 4-connected neighbors
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return region;
}

/**
 * Apply Sobel edge detection for clean, artist-quality lines
 */
function detectEdgesSobel(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number
): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(imageData.length);
  
  // Convert to grayscale first
  const gray = new Float32Array(width * height);
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i / 4] = luminosity;
  }
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  // Apply Sobel operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      
      // Apply 3x3 kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kernelIdx];
          gy += gray[idx] * sobelY[kernelIdx];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const outIdx = (y * width + x) * 4;
      
      if (magnitude > threshold) {
        edges[outIdx] = 0;
        edges[outIdx + 1] = 0;
        edges[outIdx + 2] = 0;
        edges[outIdx + 3] = 255;
      } else {
        edges[outIdx] = 255;
        edges[outIdx + 1] = 255;
        edges[outIdx + 2] = 255;
        edges[outIdx + 3] = 255;
      }
    }
  }
  
  return edges;
}

/**
 * Thicken lines for better visibility, especially at lower levels
 */
function thickenLines(
  edges: Uint8ClampedArray,
  width: number,
  height: number,
  thickness: number
): Uint8ClampedArray {
  if (thickness <= 1) return edges;
  
  const thickened = new Uint8ClampedArray(edges.length);
  
  // Initialize with white
  for (let i = 0; i < thickened.length; i += 4) {
    thickened[i] = 255;
    thickened[i + 1] = 255;
    thickened[i + 2] = 255;
    thickened[i + 3] = 255;
  }
  
  // Thicken each edge pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      if (edges[idx] === 0) {
        // Draw a circle/square around this pixel
        const radius = Math.floor(thickness / 2);
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = (ny * width + nx) * 4;
              thickened[nidx] = 0;
              thickened[nidx + 1] = 0;
              thickened[nidx + 2] = 0;
              thickened[nidx + 3] = 255;
            }
          }
        }
      }
    }
  }
  
  return thickened;
}

/**
 * Generate clean paint-by-numbers line guide with simplified contours
 * Uses Sobel edge detection for artist-quality lines
 */
export function generatePaintByNumbersLines(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  levels: number
): Uint8ClampedArray {
  // Map levels (1-10) to edge detection threshold and line thickness
  // Lower levels = higher threshold (fewer edges) + thicker lines = simple child's book
  // Higher levels = lower threshold (more edges) + thinner lines = detailed adult book
  let threshold: number;
  let lineThickness: number;
  
  if (levels <= 2) {
    threshold = 100;      // Very high - only major edges
    lineThickness = 4;    // Thick lines for kids
  } else if (levels <= 4) {
    threshold = 70;       // High - simple shapes
    lineThickness = 3;    // Medium-thick lines
  } else if (levels <= 6) {
    threshold = 45;       // Medium detail
    lineThickness = 2;    // Medium lines
  } else if (levels <= 8) {
    threshold = 30;       // More detail
    lineThickness = 2;    // Thin-ish lines
  } else {
    threshold = 20;       // Maximum detail
    lineThickness = 1;    // Thin lines for detail
  }
  
  const edges = detectEdgesSobel(imageData, width, height, threshold);
  
  // Thicken lines for visibility at lower levels
  return thickenLines(edges, width, height, lineThickness);
}

/**
 * Draw a line using Bresenham's algorithm
 */
function drawLine(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      imageData[idx] = 0;
      imageData[idx + 1] = 0;
      imageData[idx + 2] = 0;
      imageData[idx + 3] = 255;
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Generate paint-by-numbers guide with colored blocks
 */
export function generatePaintByNumbersBlocks(
  posterizedData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(posterizedData.length);

  // Copy posterized data
  output.set(posterizedData);

  // Add thin black borders between regions for clarity
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = posterizedData[idx];
      const g = posterizedData[idx + 1];
      const b = posterizedData[idx + 2];

      let isEdge = false;

      // Check right neighbor
      if (x < width - 1) {
        const idx2 = (y * width + (x + 1)) * 4;
        const r2 = posterizedData[idx2];
        const g2 = posterizedData[idx2 + 1];
        const b2 = posterizedData[idx2 + 2];
        if (r !== r2 || g !== g2 || b !== b2) isEdge = true;
      }

      // Check bottom neighbor
      if (y < height - 1) {
        const idx2 = ((y + 1) * width + x) * 4;
        const r2 = posterizedData[idx2];
        const g2 = posterizedData[idx2 + 1];
        const b2 = posterizedData[idx2 + 2];
        if (r !== r2 || g !== g2 || b !== b2) isEdge = true;
      }

      // Add subtle edge darkening
      if (isEdge) {
        const factor = 0.85; // Darken edges slightly
        output[idx] = Math.max(0, Math.round(posterizedData[idx] * factor));
        output[idx + 1] = Math.max(0, Math.round(posterizedData[idx + 1] * factor));
        output[idx + 2] = Math.max(0, Math.round(posterizedData[idx + 2] * factor));
      }
    }
  }

  return output;
}
