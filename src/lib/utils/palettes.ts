/**
 * Color palettes including famous artist palettes and mood-based collections
 */

export interface Palette {
  name: string;
  category: "artist" | "mood" | "classic";
  colors: string[]; // Array of hex color codes
  description?: string;
}

export const palettes: Record<string, Palette> = {
  // Artist Palettes
  zorn: {
    name: "Anders Zorn",
    category: "artist",
    description: "Swedish painter known for warm, earthy tones",
    colors: [
      "#FFE4B5", // Moccasin
      "#D2B48C", // Tan
      "#8B7355", // Burlywood4
      "#654321", // Dark Brown
      "#C09070", // Burnt Sienna
      "#FF8C00", // Dark Orange
      "#FFFACD", // Lemon Chiffon
      "#228B22", // Forest Green
    ],
  },
  rubenSargent: {
    name: "John Singer Sargent",
    category: "artist",
    description: "Master of rich, saturated colors",
    colors: [
      "#4A0E0E", // Deep Maroon
      "#8B4513", // Saddle Brown
      "#CD853F", // Peru
      "#DAA520", // Goldenrod
      "#FFD700", // Gold
      "#F0E68C", // Khaki
      "#DEB887", // Burlywood
      "#E6E6FA", // Lavender
    ],
  },
  rembrandtGold: {
    name: "Rembrandt Gold",
    category: "artist",
    description: "Dutch master's signature warm palette",
    colors: [
      "#1A1410", // Near Black
      "#3E2723", // Dark Brown
      "#5D4037", // Brown
      "#8D6E63", // Taupe
      "#A1887F", // Light Brown
      "#D7CCC8", // Warm Grey
      "#FFCC99", // Warm Yellow
      "#FFE082", // Light Gold
    ],
  },
  vanGogh: {
    name: "Van Gogh Nights",
    category: "artist",
    description: "Swirling blues and golds",
    colors: [
      "#0F3460", // Deep Blue
      "#1A5FA0", // Blue
      "#3B82D6", // Sky Blue
      "#60A5FA", // Light Blue
      "#FDB813", // Gold
      "#F7B801", // Darker Gold
      "#1E1B1B", // Near Black
      "#E8D5B7", // Cream
    ],
  },

  // Mood Palettes
  moodyBlues: {
    name: "Moody Blues",
    category: "mood",
    description: "Introspective and calm mood",
    colors: [
      "#001F3F", // Navy
      "#003D7A", // Deep Blue
      "#0074D9", // Blue
      "#7FDBCA", // Aqua
      "#39CCCC", // Teal
      "#2ECC40", // Green
      "#AAAAAA", // Silver
      "#F2F2F2", // Light Grey
    ],
  },
  warmAutumn: {
    name: "Warm Autumn",
    category: "mood",
    description: "Cozy and warm mood",
    colors: [
      "#8B4513", // Saddle Brown
      "#CD853F", // Peru
      "#DAA520", // Goldenrod
      "#FFD700", // Gold
      "#FF8C00", // Dark Orange
      "#FF7F50", // Coral
      "#D2691E", // Chocolate
      "#F5DEB3", // Wheat
    ],
  },
  darkMystery: {
    name: "Dark Mystery",
    category: "mood",
    description: "Deep, mysterious mood",
    colors: [
      "#1A0033", // Deep Purple
      "#2D0052", // Dark Purple
      "#440055", // Darker Purple
      "#663366", // Medium Purple
      "#9933CC", // Purple
      "#CC66FF", // Light Purple
      "#2F2F2F", // Dark Grey
      "#666666", // Medium Grey
    ],
  },
  passionRed: {
    name: "Passion Red",
    category: "mood",
    description: "Bold, energetic mood",
    colors: [
      "#330000", // Very Dark Red
      "#660000", // Dark Red
      "#990000", // Red
      "#CC0000", // Bright Red
      "#FF0000", // Pure Red
      "#FF3333", // Light Red
      "#FF9999", // Pink Red
      "#FFE6E6", // Very Light Red
    ],
  },
  forest: {
    name: "Forest Whisper",
    category: "mood",
    description: "Natural, earthy mood",
    colors: [
      "#1B3A2C", // Dark Green
      "#2D5A3D", // Deep Green
      "#3D7856", // Forest Green
      "#52A674", // Medium Green
      "#7AC5A3", // Light Green
      "#A8D5BA", // Pale Green
      "#8B7355", // Brown
      "#D2B48C", // Tan
    ],
  },
  oceanDepths: {
    name: "Ocean Depths",
    category: "mood",
    description: "Cool, tranquil mood",
    colors: [
      "#0D1B2A", // Navy
      "#1B3A52", // Dark Blue
      "#2A5678", // Blue
      "#4A8FBF", // Medium Blue
      "#7DC3E8", // Light Blue
      "#B4E7FF", // Very Light Blue
      "#4F4F4F", // Dark Grey
      "#CCCCCC", // Light Grey
    ],
  },

  // Classic Palettes
  grayscale: {
    name: "Grayscale",
    category: "classic",
    description: "Pure black and white with greys",
    colors: [
      "#000000", // Black
      "#2B2B2B", // Dark Grey
      "#555555", // Medium Grey
      "#808080", // Grey
      "#AAAAAA", // Light Grey
      "#D3D3D3", // Lighter Grey
      "#EEEEEE", // Very Light Grey
      "#FFFFFF", // White
    ],
  },
  primary: {
    name: "Primary Colors",
    category: "classic",
    description: "Red, Yellow, Blue and whites",
    colors: [
      "#FF0000", // Red
      "#0000FF", // Blue
      "#FFFF00", // Yellow
      "#FFFFFF", // White
      "#000000", // Black
      "#00FF00", // Green
      "#FF00FF", // Magenta
      "#00FFFF", // Cyan
    ],
  },
  pastel: {
    name: "Pastel Dreams",
    category: "classic",
    description: "Soft, gentle pastel colors",
    colors: [
      "#FFB3BA", // Pastel Pink
      "#FFCCCB", // Light Pink
      "#FFFFBA", // Pastel Yellow
      "#BAFFC9", // Pastel Green
      "#BAE1FF", // Pastel Blue
      "#E0BBE4", // Pastel Purple
      "#FFDFD3", // Pastel Peach
      "#D4F1F4", // Pastel Cyan
    ],
  },
};

export const paletteCategories = {
  artist: "Artist Palettes",
  mood: "Mood Palettes",
  classic: "Classic Palettes",
};

/**
 * Find the closest color in a palette to a given RGB color
 */
export function findClosestPaletteColor(
  r: number,
  g: number,
  b: number,
  palette: string[]
): string {
  let closest = palette[0];
  let minDistance = Infinity;

  for (const hex of palette) {
    const [pr, pg, pb] = hexToRgb(hex);
    const distance = Math.sqrt(
      Math.pow(r - pr, 2) + Math.pow(g - pg, 2) + Math.pow(b - pb, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closest = hex;
    }
  }

  return closest;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}
