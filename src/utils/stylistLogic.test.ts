import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeHex,
  normalizePaletteProportions,
  filterOutfitsByOccasion,
  buildFlatLayGenerationPrompt,
  applyPromptEditToOutfitPieces,
  generateBespokeFlatLaySvgDataUrl,
  toggleSavedLookbookItem,
} from './stylistLogic';
import { ColorSwatch, OutfitOption } from '../types/stylist';

const samplePalette: ColorSwatch[] = [
  { hex: '#1b4d3e', name: 'Botanical Emerald', role: 'Dominant', proportion: 50 },
  { hex: '#c8963e', name: 'Ochre Gold', role: 'Secondary', proportion: 30 },
  { hex: '#f4efe6', name: 'Warm Alabaster', role: 'Neutral Base', proportion: 20 },
];

const mockOutfits: OutfitOption[] = [
  {
    id: 'outfit-night',
    occasion: 'Night Out',
    editorialTitle: 'Velvet & Gilded Evening',
    subtitle: 'Asymmetric silk pairing',
    dressCode: 'Cocktail / Gallery Opening',
    colorHarmonyStrategy: 'High-contrast metallic amplification',
    stylistRationale: 'Pulls warm ochre metallic notes from the jacquard weave.',
    flatLayPrompt: 'Overhead flat-lay of Night Out outfit',
    flatLayImageUrl: '/test-night.jpg',
    aspectRatio: '3:4',
    imageSize: '1K',
    harmonySwatches: ['#1B4D3E', '#C8963E', '#181615'],
    editHistory: [],
    pieces: [
      {
        id: 'p1',
        category: 'Anchor Garment',
        name: 'Botanical Jacquard Midi Skirt',
        colorName: 'Emerald & Ochre',
        colorHex: '#1B4D3E',
        material: 'Silk-Cotton Jacquard',
        stylingNote: 'Anchor garment',
        isAnchor: true,
      },
      {
        id: 'p2',
        category: 'Footwear',
        name: 'Minimalist Leather Sandals',
        colorName: 'Tan Leather',
        colorHex: '#9A5B32',
        material: 'Calfskin',
        stylingNote: 'Grounds the silhouette',
      },
    ],
  },
  {
    id: 'outfit-casual',
    occasion: 'Casual',
    editorialTitle: 'Sunlit Travertine Weekend',
    subtitle: 'Relaxed organic cotton balance',
    dressCode: 'Daytime / Weekend',
    colorHarmonyStrategy: 'Neutral grounding with warm cognac accents',
    stylistRationale: 'Tones down the ornate jacquard with matte organic cotton.',
    flatLayPrompt: 'Overhead flat-lay of Casual outfit',
    flatLayImageUrl: '/test-casual.jpg',
    aspectRatio: '3:4',
    imageSize: '1K',
    harmonySwatches: ['#1B4D3E', '#F4EFE6', '#9A5B32'],
    editHistory: [],
    pieces: [],
  },
  {
    id: 'outfit-business',
    occasion: 'Business',
    editorialTitle: 'Architectural Camel Tailoring',
    subtitle: 'Structured wool blazer pairing',
    dressCode: 'Executive / Creative Office',
    colorHarmonyStrategy: 'Analogous warm camel & espresso bridge',
    stylistRationale: 'Bridges the ochre gold threads into structured camel tailoring.',
    flatLayPrompt: 'Overhead flat-lay of Business outfit',
    flatLayImageUrl: '/test-business.jpg',
    aspectRatio: '3:4',
    imageSize: '1K',
    harmonySwatches: ['#1B4D3E', '#C19A6B', '#3B2820'],
    editHistory: [],
    pieces: [],
  },
];

test('normalizeHex standardizes 3-digit and 6-digit hex strings', () => {
  assert.equal(normalizeHex('abc'), '#AABBCC');
  assert.equal(normalizeHex('#1b4d3e'), '#1B4D3E');
  assert.equal(normalizeHex('invalid-hex'), '#181615');
});

test('normalizePaletteProportions ensures swatch percentages sum to 100', () => {
  const normalized = normalizePaletteProportions([
    { hex: '#112233', name: 'One', role: 'Dominant', proportion: 10 },
    { hex: '#445566', name: 'Two', role: 'Secondary', proportion: 10 },
    { hex: '#778899', name: 'Three', role: 'Accent', proportion: 20 },
  ]);
  const sum = normalized.reduce((acc, s) => acc + s.proportion, 0);
  assert.equal(sum, 100);
  assert.equal(normalized[0].proportion, 25);
  assert.equal(normalized[2].proportion, 50);
});

test('filterOutfitsByOccasion sorts canonically (Casual, Business, Night Out) and filters cleanly', () => {
  const all = filterOutfitsByOccasion(mockOutfits, 'All');
  assert.equal(all.length, 3);
  assert.equal(all[0].occasion, 'Casual');
  assert.equal(all[1].occasion, 'Business');
  assert.equal(all[2].occasion, 'Night Out');

  const businessOnly = filterOutfitsByOccasion(mockOutfits, 'Business');
  assert.equal(businessOnly.length, 1);
  assert.equal(businessOnly[0].id, 'outfit-business');
});

test('buildFlatLayGenerationPrompt includes garment, occasion, pieces, and custom edit instruction', () => {
  const prompt = buildFlatLayGenerationPrompt(
    'Emerald Jacquard Skirt',
    'Night Out',
    mockOutfits[0].pieces,
    'Swap footwear for gold metallic heels'
  );
  assert.ok(prompt.includes('Emerald Jacquard Skirt'));
  assert.ok(prompt.includes('Night Out'));
  assert.ok(prompt.includes('Swap footwear for gold metallic heels'));
});

test('applyPromptEditToOutfitPieces updates targeted non-anchor piece while preserving anchor piece', () => {
  const { updatedPieces, updatedSubtitle, addedColorHex } = applyPromptEditToOutfitPieces(
    mockOutfits[0],
    'Swap the footwear for strappy gold metallic heels'
  );
  assert.equal(updatedPieces[0].isAnchor, true);
  assert.equal(updatedPieces[0].name, 'Botanical Jacquard Midi Skirt');
  assert.equal(updatedPieces[1].name, 'Strappy gold metallic heels');
  assert.equal(updatedPieces[1].colorName, 'Burnished Gold');
  assert.equal(addedColorHex, '#C59B41');
  assert.ok(updatedSubtitle.includes('Refined via Studio Prompt'));
});

test('generateBespokeFlatLaySvgDataUrl returns valid SVG data URI with occasion and piece details', () => {
  const svgUrl = generateBespokeFlatLaySvgDataUrl({
    occasion: 'Night Out',
    editorialTitle: 'Velvet & Gilded Evening',
    anchorName: 'Botanical Jacquard Midi Skirt',
    pieces: mockOutfits[0].pieces,
    palette: samplePalette,
    editNote: 'Add strappy gold heels',
    aspectRatio: '3:4',
  });
  assert.ok(svgUrl.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(svgUrl.replace('data:image/svg+xml;utf8,', ''));
  assert.ok(decoded.includes('Velvet &amp; Gilded Evening'));
  assert.ok(decoded.includes('Add strappy gold heels'));
});

test('toggleSavedLookbookItem adds and removes outfits deterministically', () => {
  const garment = { name: 'Botanical Jacquard Midi Skirt', imageUrl: '/skirt.jpg' };
  const step1 = toggleSavedLookbookItem([], garment, mockOutfits[0]);
  assert.equal(step1.wasAdded, true);
  assert.equal(step1.nextList.length, 1);

  const step2 = toggleSavedLookbookItem(step1.nextList, garment, mockOutfits[0]);
  assert.equal(step2.wasAdded, false);
  assert.equal(step2.nextList.length, 0);
});
