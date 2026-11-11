export type OccasionType = 'Casual' | 'Business' | 'Night Out';

export type ImageAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageResolution = '1K' | '2K' | '4K';

export interface ColorSwatch {
  hex: string;
  name: string;
  role: 'Dominant' | 'Secondary' | 'Accent' | 'Neutral Base' | 'Metallic/Highlight';
  proportion: number; // percentage 0-100
}

export interface GarmentPiece {
  id: string;
  category: 'Anchor Garment' | 'Top / Layer' | 'Outerwear / Tailoring' | 'Footwear' | 'Bag / Carry' | 'Jewelry / Accessory';
  name: string;
  colorName: string;
  colorHex: string;
  material: string;
  stylingNote: string;
  isAnchor?: boolean;
}

export interface FlatLayEditEntry {
  id: string;
  prompt: string;
  timestamp: string;
  imageUrl: string;
  aspectRatio: ImageAspectRatio;
  imageSize: ImageResolution;
  modelUsed: string;
}

export interface OutfitOption {
  id: string;
  occasion: OccasionType;
  editorialTitle: string;
  subtitle: string;
  dressCode: string;
  colorHarmonyStrategy: string;
  stylistRationale: string;
  flatLayPrompt: string;
  flatLayImageUrl: string;
  aspectRatio: ImageAspectRatio;
  imageSize: ImageResolution;
  pieces: GarmentPiece[];
  harmonySwatches: string[];
  editHistory: FlatLayEditEntry[];
}

export interface GarmentAnalysis {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  silhouette: string;
  fabricAndTexture: string;
  patternComplexity: 'High — Multi-Hue Motif' | 'Medium — Geometric / Woven' | 'Low — Tonal Texture';
  seasonality: string;
  versatilityScore: number;
  stylingChallenge: string;
  stylistVerdict: string;
  palette: ColorSwatch[];
  outfits: OutfitOption[];
}

export interface SavedLookbookItem {
  id: string;
  savedAt: string;
  garmentName: string;
  garmentImageUrl: string;
  outfit: OutfitOption;
}
