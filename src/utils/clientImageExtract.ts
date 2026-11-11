import { ColorSwatch, GarmentAnalysis, GarmentPiece, OutfitOption } from '../types/stylist';
import {
  generateBespokeFlatLaySvgDataUrl,
  normalizeHex,
  normalizePaletteProportions,
} from './stylistLogic';

const COLOR_NAMES: Array<{ hex: string; name: string; r: number; g: number; b: number }> = [
  { hex: '#1B5E49', name: 'Botanical Emerald', r: 27, g: 94, b: 73 },
  { hex: '#1B4382', name: 'Electric Cobalt', r: 27, g: 67, b: 130 },
  { hex: '#8A2B32', name: 'Oxblood Crimson', r: 138, g: 43, b: 50 },
  { hex: '#C59B41', name: 'Ochre Gold', r: 197, g: 155, b: 65 },
  { hex: '#9E472A', name: 'Burnt Terracotta', r: 158, g: 71, b: 42 },
  { hex: '#9A5B32', name: 'Spiced Cognac', r: 154, g: 91, b: 50 },
  { hex: '#C69F73', name: 'Warm Camel', r: 198, g: 159, b: 115 },
  { hex: '#F3EFE6', name: 'Warm Alabaster', r: 243, g: 239, b: 230 },
  { hex: '#D8CEBE', name: 'Raw Linen Ecru', r: 216, g: 206, b: 190 },
  { hex: '#4A5D4E', name: 'Muted Sage', r: 74, g: 93, b: 78 },
  { hex: '#5D4361', name: 'Damson Plum', r: 93, g: 67, b: 97 },
  { hex: '#223147', name: 'Midnight Navy', r: 34, g: 49, b: 71 },
  { hex: '#3A261E', name: 'Roasted Espresso', r: 58, g: 38, b: 30 },
  { hex: '#181615', name: 'Obsidian Ink', r: 24, g: 22, b: 21 },
];

function findClosestColorName(r: number, g: number, b: number): string {
  let best = 'Studio Hue';
  let minDist = Infinity;
  for (const entry of COLOR_NAMES) {
    const dist = Math.hypot(entry.r - r, entry.g - g, entry.b - b);
    if (dist < minDist) {
      minDist = dist;
      best = entry.name;
    }
  }
  return best;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Samples an uploaded image data URL on an HTML5 canvas to extract 5 distinct color swatches.
 */
export async function extractPaletteFromImageDataUrl(dataUrl: string): Promise<ColorSwatch[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2d context');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          // Quantize into 32-step buckets
          const qr = Math.round(r / 36) * 36;
          const qg = Math.round(g / 36) * 36;
          const qb = Math.round(b / 36) * 36;
          const key = `${qr}-${qg}-${qb}`;
          const prev = buckets.get(key);
          if (prev) {
            prev.r = (prev.r * prev.count + r) / (prev.count + 1);
            prev.g = (prev.g * prev.count + g) / (prev.count + 1);
            prev.b = (prev.b * prev.count + b) / (prev.count + 1);
            prev.count += 1;
          } else {
            buckets.set(key, { r, g, b, count: 1 });
          }
        }

        const sorted = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 5);
        const roles: ColorSwatch['role'][] = [
          'Dominant',
          'Secondary',
          'Neutral Base',
          'Accent',
          'Metallic/Highlight',
        ];

        const rawSwatches: ColorSwatch[] = sorted.map((b, idx) => ({
          hex: rgbToHex(b.r, b.g, b.b),
          name: findClosestColorName(b.r, b.g, b.b),
          role: roles[idx] || 'Accent',
          proportion: b.count,
        }));

        while (rawSwatches.length < 5) {
          const fallback = COLOR_NAMES[rawSwatches.length];
          rawSwatches.push({
            hex: fallback.hex,
            name: fallback.name,
            role: roles[rawSwatches.length] || 'Accent',
            proportion: 5,
          });
        }

        resolve(normalizePaletteProportions(rawSwatches));
      } catch {
        resolve([
          { hex: '#8A2B32', name: 'Oxblood Crimson', role: 'Dominant', proportion: 42 },
          { hex: '#C59B41', name: 'Ochre Gold', role: 'Secondary', proportion: 26 },
          { hex: '#F3EFE6', name: 'Warm Alabaster', role: 'Neutral Base', proportion: 18 },
          { hex: '#3A261E', name: 'Roasted Espresso', role: 'Accent', proportion: 9 },
          { hex: '#181615', name: 'Obsidian Ink', role: 'Metallic/Highlight', proportion: 5 },
        ]);
      }
    };
    img.onerror = () => {
      resolve([
        { hex: '#8A2B32', name: 'Oxblood Crimson', role: 'Dominant', proportion: 42 },
        { hex: '#C59B41', name: 'Ochre Gold', role: 'Secondary', proportion: 26 },
        { hex: '#F3EFE6', name: 'Warm Alabaster', role: 'Neutral Base', proportion: 18 },
        { hex: '#3A261E', name: 'Roasted Espresso', role: 'Accent', proportion: 9 },
        { hex: '#181615', name: 'Obsidian Ink', role: 'Metallic/Highlight', proportion: 5 },
      ]);
    };
    img.src = dataUrl;
  });
}

/**
 * Hydrates a raw Gemini API response or generates a complete deterministic GarmentAnalysis
 * with 3 flat-lay outfits when using local/fallback synthesis.
 */
export function buildCompleteAnalysisFromUpload(options: {
  id: string;
  garmentName: string;
  garmentCategory: string;
  garmentNotes: string;
  imageUrl: string;
  extractedPalette: ColorSwatch[];
  apiAnalysis?: Partial<GarmentAnalysis>;
}): GarmentAnalysis {
  const { id, garmentName, garmentCategory, garmentNotes, imageUrl, extractedPalette, apiAnalysis } = options;

  const palette = normalizePaletteProportions(
    apiAnalysis?.palette && apiAnalysis.palette.length >= 3 ? apiAnalysis.palette : extractedPalette
  );

  const dom = palette[0] || { hex: '#1B5E49', name: 'Deep Emerald' };
  const sec = palette[1] || { hex: '#C59B41', name: 'Ochre Gold' };
  const neu = palette[2] || { hex: '#F3EFE6', name: 'Warm Alabaster' };
  const acc = palette[3] || { hex: '#9A5B32', name: 'Warm Cognac' };

  const defaultCasualPieces: GarmentPiece[] = [
    {
      id: `${id}-cas-1`,
      category: 'Anchor Garment',
      name: garmentName,
      colorName: `${dom.name} & ${sec.name}`,
      colorHex: normalizeHex(dom.hex),
      material: 'Signature Woven Textile',
      stylingNote: 'Anchor focal piece styled with relaxed daytime proportions.',
      isAnchor: true,
    },
    {
      id: `${id}-cas-2`,
      category: 'Top / Layer',
      name: 'Heavyweight Organic Cotton Crewneck Tee',
      colorName: neu.name,
      colorHex: normalizeHex(neu.hex),
      material: '280gsm Combed Organic Cotton',
      stylingNote: 'Balances the complex palette with breathable matte texture.',
    },
    {
      id: `${id}-cas-3`,
      category: 'Footwear',
      name: 'Artisanal Leather Slide Sandals',
      colorName: acc.name,
      colorHex: normalizeHex(acc.hex),
      material: 'Vegetable-Tanned Calfskin',
      stylingNote: 'Grounds the hemline with warm natural leather.',
    },
    {
      id: `${id}-cas-4`,
      category: 'Bag / Carry',
      name: 'Woven Raffia & Saddle Crossbody Bag',
      colorName: 'Natural Raffia',
      colorHex: '#D8CEBE',
      material: 'Handwoven Raffia & Bridle Leather',
      stylingNote: 'Adds relaxed tactile contrast for daytime errands.',
    },
    {
      id: `${id}-cas-5`,
      category: 'Jewelry / Accessory',
      name: 'Sculptural Vermeil Hoop Earrings',
      colorName: sec.name,
      colorHex: normalizeHex(sec.hex),
      material: '18k Gold Vermeil',
      stylingNote: 'Echoes the secondary warm highlight in the garment.',
    },
  ];

  const defaultBusinessPieces: GarmentPiece[] = [
    {
      id: `${id}-biz-1`,
      category: 'Anchor Garment',
      name: garmentName,
      colorName: `${dom.name} & ${sec.name}`,
      colorHex: normalizeHex(dom.hex),
      material: 'Signature Woven Textile',
      stylingNote: 'Anchored cleanly inside structured suiting proportions.',
      isAnchor: true,
    },
    {
      id: `${id}-biz-2`,
      category: 'Outerwear / Tailoring',
      name: 'Single-Breasted Architectural Wool Blazer',
      colorName: 'Tailored Camel',
      colorHex: '#C69F73',
      material: 'Super 120s Virgin Wool',
      stylingNote: 'Sharpens the shoulder line and frames the statement piece.',
    },
    {
      id: `${id}-biz-3`,
      category: 'Top / Layer',
      name: 'Crêpe de Chine Point-Collar Silk Blouse',
      colorName: 'Crisp Ivory',
      colorHex: '#F3EFE6',
      material: '19-Momme Mulberry Silk',
      stylingNote: 'Brings luminous executive polish near the collarbone.',
    },
    {
      id: `${id}-biz-4`,
      category: 'Footwear',
      name: 'Pointed-Toe Leather Slingback Heels',
      colorName: 'Roasted Espresso',
      colorHex: '#3A261E',
      material: 'Box Calfskin Leather',
      stylingNote: 'Elongates the silhouette with sharp tailored geometry.',
    },
    {
      id: `${id}-biz-5`,
      category: 'Bag / Carry',
      name: 'Structured Top-Handle Portfolio Tote',
      colorName: acc.name,
      colorHex: normalizeHex(acc.hex),
      material: 'Full-Grain Pebbled Leather',
      stylingNote: 'Clean architectural lines counteract pattern complexity.',
    },
  ];

  const defaultNightPieces: GarmentPiece[] = [
    {
      id: `${id}-no-1`,
      category: 'Anchor Garment',
      name: garmentName,
      colorName: `${dom.name} & ${sec.name}`,
      colorHex: normalizeHex(dom.hex),
      material: 'Signature Woven Textile',
      stylingNote: 'Elevated for evening with high-contrast specular pairings.',
      isAnchor: true,
    },
    {
      id: `${id}-no-2`,
      category: 'Top / Layer',
      name: 'Asymmetric Draped Silk Charmeuse Top',
      colorName: 'Obsidian Noir',
      colorHex: '#181615',
      material: 'Heavy Mulberry Silk Satin',
      stylingNote: 'Creates dramatic evening contrast that lets the anchor piece shine.',
    },
    {
      id: `${id}-no-3`,
      category: 'Footwear',
      name: 'Strappy Metallic Stiletto Sandals',
      colorName: 'Burnished Gold',
      colorHex: '#C59B41',
      material: 'Laminated Metallic Nappa',
      stylingNote: 'Draws out warm highlights for cocktail and gallery lighting.',
    },
    {
      id: `${id}-no-4`,
      category: 'Bag / Carry',
      name: 'Brushed Brass Box Evening Clutch',
      colorName: 'Gilded Brass',
      colorHex: '#B89242',
      material: 'Hand-Brushed Artisanal Brass',
      stylingNote: 'Compact sculptural statement piece.',
    },
    {
      id: `${id}-no-5`,
      category: 'Jewelry / Accessory',
      name: 'Hammered Chandelier Drop Earrings',
      colorName: sec.name,
      colorHex: normalizeHex(sec.hex),
      material: '18k Gold Vermeil',
      stylingNote: 'Completes the evening vertical focal line.',
    },
  ];

  const buildOutfit = (
    occasion: 'Casual' | 'Business' | 'Night Out',
    fallbackTitle: string,
    fallbackSubtitle: string,
    fallbackDressCode: string,
    fallbackStrategy: string,
    fallbackRationale: string,
    fallbackPieces: GarmentPiece[]
  ): OutfitOption => {
    const apiMatch = apiAnalysis?.outfits?.find((o) => o.occasion === occasion);
    const pieces =
      apiMatch?.pieces && apiMatch.pieces.length >= 3
        ? apiMatch.pieces.map((p, idx) => ({
            ...p,
            id: `${id}-${occasion}-${idx}`,
            colorHex: normalizeHex(p.colorHex || dom.hex),
            isAnchor: idx === 0 ? true : Boolean(p.isAnchor),
          }))
        : fallbackPieces;

    const editorialTitle = apiMatch?.editorialTitle || fallbackTitle;
    return {
      id: `${id}-${occasion.toLowerCase().replace(/\s+/g, '')}`,
      occasion,
      editorialTitle,
      subtitle: apiMatch?.subtitle || fallbackSubtitle,
      dressCode: apiMatch?.dressCode || fallbackDressCode,
      colorHarmonyStrategy: apiMatch?.colorHarmonyStrategy || fallbackStrategy,
      stylistRationale: apiMatch?.stylistRationale || fallbackRationale,
      flatLayPrompt:
        apiMatch?.flatLayPrompt ||
        `Overhead knolling flat-lay fashion photography of a complete ${occasion} outfit featuring ${garmentName}.`,
      flatLayImageUrl: generateBespokeFlatLaySvgDataUrl({
        occasion,
        editorialTitle,
        anchorName: garmentName,
        pieces,
        palette,
      }),
      aspectRatio: '3:4',
      imageSize: '1K',
      harmonySwatches:
        apiMatch?.harmonySwatches && apiMatch.harmonySwatches.length >= 3
          ? apiMatch.harmonySwatches.map(normalizeHex)
          : [normalizeHex(dom.hex), normalizeHex(sec.hex), normalizeHex(neu.hex), normalizeHex(acc.hex)],
      editHistory: [],
      pieces,
    };
  };

  return {
    id,
    name: apiAnalysis?.name || garmentName,
    category: apiAnalysis?.category || garmentCategory || 'Statement Wardrobe Piece',
    imageUrl,
    silhouette: apiAnalysis?.silhouette || 'Tailored Statement Silhouette',
    fabricAndTexture:
      apiAnalysis?.fabricAndTexture ||
      (garmentNotes ? garmentNotes : 'Multi-Tone Textured Weave with Dimensional Surface'),
    patternComplexity: apiAnalysis?.patternComplexity || 'High — Multi-Hue Motif',
    seasonality: apiAnalysis?.seasonality || 'Four-Season Transitional Anchor',
    versatilityScore: apiAnalysis?.versatilityScore || 92,
    stylingChallenge:
      apiAnalysis?.stylingChallenge ||
      `Distinctive ${dom.name.toLowerCase()} and ${sec.name.toLowerCase()} color interplay can clash with competing prints or lose proportion without deliberate neutral framing.`,
    stylistVerdict:
      apiAnalysis?.stylistVerdict ||
      `Anchor the look by isolating ${dom.name} as your primary chromatic statement, using ${neu.name} near the face for daytime openness and deep obsidian or warm camel tailoring for evening and executive polish.`,
    palette,
    outfits: [
      buildOutfit(
        'Casual',
        'Effortless Daylight Knolling',
        `Relaxed ${neu.name.toLowerCase()} organic cotton with ${acc.name.toLowerCase()} leather slides`,
        'Weekend Gallery / Daytime Stroll',
        `Neutral Grounding (${neu.name} + ${acc.name})`,
        `Calms the statement ${dom.name.toLowerCase()} motif with breathable organic cotton and natural woven textures.`,
        defaultCasualPieces
      ),
      buildOutfit(
        'Business',
        'Tailored Atelier Authority',
        'Single-breasted camel wool blazer over crisp ivory silk with espresso slingbacks',
        'Executive Office / Creative Presentation',
        `Analogous Warm Bridge (${sec.name} + Espresso)`,
        `Frames the garment inside structured wool tailoring while pulling ${sec.name.toLowerCase()} undertones into the accessories.`,
        defaultBusinessPieces
      ),
      buildOutfit(
        'Night Out',
        'Chiaroscuro Silk & Brass',
        'Asymmetric obsidian silk charmeuse top with strappy metallic gold heels',
        'Cocktail / Evening Vernissage',
        `High-Contrast Evening Amplification (Obsidian + ${sec.name})`,
        `Amplifies the richest tones in the piece with liquid black silk and specular metallic gold hardware.`,
        defaultNightPieces
      ),
    ],
  };
}
