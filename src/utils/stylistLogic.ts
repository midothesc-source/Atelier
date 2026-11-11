import {
  ColorSwatch,
  GarmentAnalysis,
  GarmentPiece,
  ImageAspectRatio,
  ImageResolution,
  OccasionType,
  OutfitOption,
  SavedLookbookItem,
} from '../types/stylist';

/**
 * Normalizes a hex color string to uppercase #RRGGBB format.
 */
export function normalizeHex(hex: string): string {
  const cleaned = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return (
      '#' +
      cleaned
        .split('')
        .map((c) => c + c)
        .join('')
        .toUpperCase()
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return '#' + cleaned.toUpperCase();
  }
  return '#181615';
}

/**
 * Converts a #RRGGBB hex string into RGB components.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(hex).slice(1);
  const num = parseInt(norm, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates relative luminance for WCAG contrast checks.
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/**
 * Validates and normalizes palette proportions so they sum to 100%.
 */
export function normalizePaletteProportions(palette: ColorSwatch[]): ColorSwatch[] {
  if (!palette.length) return [];
  const total = palette.reduce((acc, s) => acc + Math.max(1, s.proportion || 0), 0);
  let running = 0;
  return palette.map((swatch, idx) => {
    if (idx === palette.length - 1) {
      return {
        ...swatch,
        hex: normalizeHex(swatch.hex),
        proportion: Math.max(1, 100 - running),
      };
    }
    const scaled = Math.max(1, Math.round((Math.max(1, swatch.proportion || 0) / total) * 100));
    running += scaled;
    return {
      ...swatch,
      hex: normalizeHex(swatch.hex),
      proportion: scaled,
    };
  });
}

/**
 * Filters outfit options by occasion or returns all 3 in canonical order (Casual, Business, Night Out).
 */
export function filterOutfitsByOccasion(
  outfits: OutfitOption[],
  occasionFilter: 'All' | OccasionType
): OutfitOption[] {
  const order: Record<OccasionType, number> = {
    Casual: 1,
    Business: 2,
    'Night Out': 3,
  };
  const sorted = [...outfits].sort((a, b) => (order[a.occasion] ?? 99) - (order[b.occasion] ?? 99));
  if (occasionFilter === 'All') return sorted;
  return sorted.filter((o) => o.occasion === occasionFilter);
}

/**
 * Builds a structured overhead flat-lay photography prompt for gemini-nano-banana-2.1.
 */
export function buildFlatLayGenerationPrompt(
  garmentName: string,
  occasion: OccasionType,
  pieces: GarmentPiece[],
  customInstruction?: string
): string {
  const pieceDescriptions = pieces
    .map((p) => `${p.name} in ${p.colorName} (${p.material})`)
    .join(', ');

  const surfaceByOccasion: Record<OccasionType, string> = {
    Casual: 'warm natural travertine stone surface with soft morning daylight',
    Business: 'honed architectural limestone surface with crisp editorial studio lighting',
    'Night Out': 'warm alabaster marble surface with dramatic directional evening studio lighting',
  };

  const base = `Overhead knolling flat-lay fashion photography of a complete ${occasion} outfit featuring ${garmentName}. Neatly arranged pieces: ${pieceDescriptions}. Styled on a ${surfaceByOccasion[occasion]}, Vogue editorial wardrobe archive aesthetic, crisp textile textures, 8k commercial photography.`;

  if (customInstruction && customInstruction.trim().length > 0) {
    return `${base} Styling modification: ${customInstruction.trim()}`;
  }
  return base;
}

/**
 * Applies a user's natural-language styling edit prompt to an OutfitOption's piece breakdown
 * so that piece list, harmony swatches, and prompt stay synchronized even before or alongside AI image generation.
 */
export function applyPromptEditToOutfitPieces(
  outfit: OutfitOption,
  editPrompt: string
): { updatedPieces: GarmentPiece[]; updatedSubtitle: string; addedColorHex?: string } {
  const cleanPrompt = editPrompt.trim();
  if (!cleanPrompt) {
    return { updatedPieces: outfit.pieces, updatedSubtitle: outfit.subtitle };
  }

  const lower = cleanPrompt.toLowerCase();
  const colorMap: Array<{ keywords: string[]; name: string; hex: string }> = [
    { keywords: ['gold', 'brass', 'gilded', 'champagne'], name: 'Burnished Gold', hex: '#C59B41' },
    { keywords: ['silver', 'chrome', 'pewter', 'platinum'], name: 'Brushed Silver', hex: '#A9B0B8' },
    { keywords: ['emerald', 'forest', 'green', 'sage'], name: 'Deep Emerald', hex: '#1B5E49' },
    { keywords: ['burgundy', 'wine', 'merlot', 'oxblood', 'crimson', 'red'], name: 'Oxblood Bordeaux', hex: '#5E1924' },
    { keywords: ['cobalt', 'navy', 'indigo', 'blue', 'denim'], name: 'Midnight Cobalt', hex: '#1D3E6E' },
    { keywords: ['camel', 'tan', 'cognac', 'caramel', 'suede'], name: 'Warm Cognac', hex: '#9A5B32' },
    { keywords: ['black', 'onyx', 'noir', 'obsidian'], name: 'Obsidian Noir', hex: '#181615' },
    { keywords: ['ivory', 'cream', 'white', 'pearl', 'ecru'], name: 'Warm Ecru', hex: '#F3EFE6' },
    { keywords: ['terracotta', 'rust', 'sienna', 'copper'], name: 'Burnt Sienna', hex: '#9E472A' },
  ];

  let matchedColor = { name: 'Atelier Accent', hex: '#8C6239' };
  for (const entry of colorMap) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      matchedColor = { name: entry.name, hex: entry.hex };
      break;
    }
  }

  // Determine which category is targeted by the prompt
  let targetCategory: GarmentPiece['category'] = 'Jewelry / Accessory';
  if (
    lower.includes('shoe') ||
    lower.includes('heel') ||
    lower.includes('boot') ||
    lower.includes('sandal') ||
    lower.includes('sneaker') ||
    lower.includes('loafer') ||
    lower.includes('mule') ||
    lower.includes('footwear')
  ) {
    targetCategory = 'Footwear';
  } else if (
    lower.includes('bag') ||
    lower.includes('clutch') ||
    lower.includes('tote') ||
    lower.includes('purse') ||
    lower.includes('crossbody') ||
    lower.includes('handbag')
  ) {
    targetCategory = 'Bag / Carry';
  } else if (
    lower.includes('blazer') ||
    lower.includes('jacket') ||
    lower.includes('coat') ||
    lower.includes('cardigan') ||
    lower.includes('trench')
  ) {
    targetCategory = 'Outerwear / Tailoring';
  } else if (
    lower.includes('shirt') ||
    lower.includes('blouse') ||
    lower.includes('tee') ||
    lower.includes('top') ||
    lower.includes('sweater') ||
    lower.includes('knit') ||
    lower.includes('camisole') ||
    lower.includes('turtleneck')
  ) {
    targetCategory = 'Top / Layer';
  }

  const stripped = cleanPrompt
    .replace(
      /^(swap|replace|change|switch|update|add|use)\s+(the\s+)?((footwear|shoes|heels|sandals|sneakers|loafers|bag|clutch|tote|handbag|top|shirt|blouse|tee|sweater|blazer|jacket|coat|cardigan|jewelry|earrings)\s+(for|with|to)\s+)?/i,
      ''
    )
    .replace(/^(a|an|the)\s+/i, '')
    .trim();

  const rawLabel = stripped.length > 0 ? stripped : cleanPrompt;
  const capitalized = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
  const conciseName =
    capitalized.length > 52 ? capitalized.slice(0, 49).trim() + '...' : capitalized;

  const updatedPieces = outfit.pieces.map((piece) => {
    if (piece.isAnchor) return piece;
    if (piece.category === targetCategory) {
      return {
        ...piece,
        name: conciseName,
        colorName: matchedColor.name,
        colorHex: matchedColor.hex,
        stylingNote: `Custom AI Studio refinement: "${cleanPrompt}"`,
      };
    }
    return piece;
  });

  // If no existing piece matched that category, replace the last non-anchor piece
  const didUpdate = updatedPieces.some((p, i) => p !== outfit.pieces[i]);
  if (!didUpdate && updatedPieces.length > 1) {
    const lastIdx = updatedPieces.length - 1;
    if (!updatedPieces[lastIdx].isAnchor) {
      updatedPieces[lastIdx] = {
        ...updatedPieces[lastIdx],
        name: conciseName,
        colorName: matchedColor.name,
        colorHex: matchedColor.hex,
        stylingNote: `Custom AI Studio refinement: "${cleanPrompt}"`,
      };
    }
  }

  return {
    updatedPieces,
    updatedSubtitle: `Refined via Studio Prompt · ${conciseName}`,
    addedColorHex: matchedColor.hex,
  };
}

/**
 * Generates a high-craft SVG data URL representing an overhead knolling flat-lay board.
 * Used when creating custom edits or custom garments if the remote paid image model is unavailable,
 * ensuring the user always sees a crisp, bespoke flat-lay composition reflecting their exact colors & pieces.
 */
export function generateBespokeFlatLaySvgDataUrl(options: {
  occasion: OccasionType;
  editorialTitle: string;
  anchorName: string;
  pieces: GarmentPiece[];
  palette: ColorSwatch[];
  editNote?: string;
  aspectRatio?: ImageAspectRatio;
}): string {
  const { occasion, editorialTitle, anchorName, pieces, palette, editNote, aspectRatio = '3:4' } = options;

  const dimensions: Record<ImageAspectRatio, { w: number; h: number }> = {
    '1:1': { w: 900, h: 900 },
    '3:4': { w: 900, h: 1200 },
    '4:3': { w: 1200, h: 900 },
    '9:16': { w: 720, h: 1280 },
    '16:9': { w: 1280, h: 720 },
  };

  const { w, h } = dimensions[aspectRatio] || dimensions['3:4'];
  const c0 = palette[0]?.hex || '#1D4E3E';
  const c1 = palette[1]?.hex || '#C59B41';
  const c2 = palette[2]?.hex || '#E8E0D0';
  const c3 = palette[3]?.hex || '#7C4D33';
  const c4 = palette[4]?.hex || '#1F2421';

  const topPiece = pieces.find((p) => p.category === 'Top / Layer' || p.category === 'Outerwear / Tailoring') || pieces[1];
  const shoePiece = pieces.find((p) => p.category === 'Footwear') || pieces[2];
  const bagPiece = pieces.find((p) => p.category === 'Bag / Carry') || pieces[3];
  const accPiece = pieces.find((p) => p.category === 'Jewelry / Accessory') || pieces[4];

  const topColor = topPiece?.colorHex || c2;
  const shoeColor = shoePiece?.colorHex || c3;
  const bagColor = bagPiece?.colorHex || c1;
  const accColor = accPiece?.colorHex || '#C59B41';

  const bgTone = occasion === 'Night Out' ? '#EAE4DA' : occasion === 'Business' ? '#EFECE6' : '#F4F0E8';

  const esc = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="stoneGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgTone}" />
        <stop offset="100%" stop-color="#E2DDD2" />
      </linearGradient>
      <pattern id="jacquardMotif" width="48" height="48" patternUnits="userSpaceOnUse">
        <rect width="48" height="48" fill="${c0}" />
        <circle cx="24" cy="24" r="14" fill="none" stroke="${c1}" stroke-width="2.5" opacity="0.78" />
        <path d="M12 12 L36 36 M36 12 L12 36" stroke="${c2}" stroke-width="1.2" opacity="0.45" />
        <circle cx="24" cy="24" r="4" fill="${c1}" opacity="0.85" />
      </pattern>
      <filter id="softShadow" x="-12%" y="-12%" width="128%" height="128%">
        <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#181615" flood-opacity="0.14" />
      </filter>
    </defs>

    <!-- Studio Travertine Surface -->
    <rect width="${w}" height="${h}" fill="url(#stoneGrad)" />
    <rect x="28" y="28" width="${w - 56}" height="${h - 56}" fill="none" stroke="#181615" stroke-opacity="0.12" stroke-width="1" />

    <!-- Header Studio Stamp -->
    <text x="56" y="72" font-family="Georgia, serif" font-size="15" fill="#5E5850" letter-spacing="3">${esc(occasion.toUpperCase())} FLAT-LAY · STUDIO COMPOSITE</text>
    <text x="56" y="106" font-family="Georgia, serif" font-size="30" font-weight="600" fill="#181615">${esc(editorialTitle)}</text>

    <!-- Upper Left: Top / Tailoring Piece -->
    <g transform="translate(80, 165)" filter="url(#softShadow)">
      <path d="M75 0 L155 0 L190 30 L245 145 L195 165 L168 95 L168 295 L62 295 L62 95 L35 165 L-15 145 L40 30 Z" fill="${topColor}" stroke="#181615" stroke-opacity="0.18" stroke-width="1.5" />
      <path d="M82 4 Q115 38 148 4" fill="none" stroke="#181615" stroke-opacity="0.25" stroke-width="2" />
      <text x="115" y="335" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600" fill="#181615">${esc((topPiece?.name || 'Tailored Top').slice(0, 28))}</text>
      <text x="115" y="354" text-anchor="middle" font-family="monospace" font-size="11" fill="#5E5850">${esc(topPiece?.colorName || 'Ivory Silk')}</text>
    </g>

    <!-- Center-Right Hero: Anchor Garment (Patterned Silhouette) -->
    <g transform="translate(385, 195)" filter="url(#softShadow)">
      <path d="M90 0 L280 0 L355 460 Q185 495 15 460 Z" fill="url(#jacquardMotif)" stroke="${c4}" stroke-opacity="0.3" stroke-width="2" />
      <rect x="90" y="0" width="190" height="28" fill="${c0}" stroke="${c1}" stroke-width="1" />
      <line x1="145" y1="28" x2="105" y2="465" stroke="${c4}" stroke-opacity="0.22" stroke-width="2" />
      <line x1="225" y1="28" x2="265" y2="465" stroke="${c4}" stroke-opacity="0.22" stroke-width="2" />
      <text x="185" y="505" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#181615">${esc(anchorName.slice(0, 34))} (Anchor)</text>
    </g>

    <!-- Lower Left: Footwear Pair -->
    <g transform="translate(95, 595)" filter="url(#softShadow)">
      <rect x="15" y="0" width="76" height="195" rx="36" fill="${shoeColor}" stroke="#181615" stroke-opacity="0.22" stroke-width="1.5" />
      <rect x="25" y="35" width="56" height="45" rx="10" fill="${c1}" opacity="0.35" />
      <rect x="112" y="12" width="76" height="195" rx="36" fill="${shoeColor}" stroke="#181615" stroke-opacity="0.22" stroke-width="1.5" />
      <rect x="122" y="47" width="56" height="45" rx="10" fill="${c1}" opacity="0.35" />
      <text x="102" y="242" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600" fill="#181615">${esc((shoePiece?.name || 'Leather Footwear').slice(0, 28))}</text>
      <text x="102" y="261" text-anchor="middle" font-family="monospace" font-size="11" fill="#5E5850">${esc(shoePiece?.colorName || 'Warm Cognac')}</text>
    </g>

    <!-- Lower Right: Structured Bag & Jewelry -->
    <g transform="translate(465, 750)" filter="url(#softShadow)">
      <path d="M55 0 C55 -48, 155 -48, 155 0" fill="none" stroke="${bagColor}" stroke-width="10" stroke-linecap="round" />
      <rect x="0" y="0" width="210" height="145" rx="18" fill="${bagColor}" stroke="#181615" stroke-opacity="0.22" stroke-width="1.5" />
      <rect x="88" y="54" width="34" height="22" rx="4" fill="${accColor}" />
      <circle cx="285" cy="45" r="26" fill="none" stroke="${accColor}" stroke-width="7" />
      <circle cx="335" cy="65" r="26" fill="none" stroke="${accColor}" stroke-width="7" />
      <text x="155" y="185" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600" fill="#181615">${esc((bagPiece?.name || 'Structured Carry').slice(0, 28))} · ${esc((accPiece?.name || 'Jewelry').slice(0, 20))}</text>
    </g>

    <!-- Bottom Color Palette Strip -->
    <g transform="translate(56, ${h - 115})">
      <text x="0" y="0" font-family="monospace" font-size="11" fill="#5E5850" letter-spacing="1.5">EXTRACTED HARMONY PALETTE</text>
      <rect x="0" y="14" width="44" height="22" fill="${c0}" />
      <rect x="52" y="14" width="44" height="22" fill="${c1}" />
      <rect x="104" y="14" width="44" height="22" fill="${c2}" stroke="#181615" stroke-opacity="0.15" />
      <rect x="156" y="14" width="44" height="22" fill="${c3}" />
      <rect x="208" y="14" width="44" height="22" fill="${c4}" />
      ${
        editNote
          ? `<text x="276" y="30" font-family="sans-serif" font-size="12" font-weight="600" fill="#9E472A">Prompt Edit Applied: "${esc(editNote.slice(0, 48))}"</text>`
          : `<text x="276" y="30" font-family="sans-serif" font-size="12" fill="#5E5850">Balanced 60-30-10 proportion across anchor piece and accessories</text>`
      }
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Toggles an outfit in the saved lookbook list (adds if missing, removes if already saved).
 */
export function toggleSavedLookbookItem(
  currentList: SavedLookbookItem[],
  garment: Pick<GarmentAnalysis, 'name' | 'imageUrl'>,
  outfit: OutfitOption
): { nextList: SavedLookbookItem[]; wasAdded: boolean } {
  const existingIdx = currentList.findIndex((item) => item.outfit.id === outfit.id);
  if (existingIdx !== -1) {
    const nextList = currentList.filter((_, idx) => idx !== existingIdx);
    return { nextList, wasAdded: false };
  }
  const newItem: SavedLookbookItem = {
    id: `saved-${outfit.id}-${Date.now()}`,
    savedAt: new Date().toISOString(),
    garmentName: garment.name,
    garmentImageUrl: garment.imageUrl,
    outfit,
  };
  return {
    nextList: [newItem, ...currentList],
    wasAdded: true,
  };
}
