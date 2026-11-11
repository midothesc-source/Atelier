import React, { useState } from 'react';
import { X, Wand2, RotateCcw, Sparkles, Check, History } from 'lucide-react';
import {
  ColorSwatch,
  ImageAspectRatio,
  ImageResolution,
  OutfitOption,
} from '../types/stylist';
import {
  applyPromptEditToOutfitPieces,
  buildFlatLayGenerationPrompt,
  generateBespokeFlatLaySvgDataUrl,
} from '../utils/stylistLogic';

interface FlatLayEditorModalProps {
  outfit: OutfitOption | null;
  anchorName: string;
  palette: ColorSwatch[];
  onClose: () => void;
  onUpdateOutfit: (updatedOutfit: OutfitOption, statusNotice?: string) => void;
}

const QUICK_EDIT_PROMPTS: Record<string, string[]> = {
  Casual: [
    'Swap the footwear for minimalist white leather low-top sneakers',
    'Add an oversized camel cashmere cardigan draped over the top',
    'Replace the bag with an emerald canvas and leather tote bag',
    'Swap top for a tucked-in Breton striped organic cotton shirt',
  ],
  Business: [
    'Swap footwear for burgundy oxblood leather loafers with gold horsebit',
    'Replace blazer with a belted ivory double-breasted trench coat',
    'Swap bag for a structured Deep Emerald crocodile-embossed briefcase',
    'Change top to a high-neck champagne silk satin blouse',
  ],
  'Night Out': [
    'Swap footwear for strappy burnished gold metallic stiletto sandals',
    'Add a cropped black velvet tuxedo jacket with satin lapels',
    'Replace clutch with an emerald duchess satin evening box clutch',
    'Swap top for a draped burgundy merlot silk halter top',
  ],
};

const ASPECT_RATIOS: ImageAspectRatio[] = ['3:4', '1:1', '4:3', '9:16', '16:9'];
const RESOLUTIONS: ImageResolution[] = ['1K', '2K', '4K'];

export const FlatLayEditorModal: React.FC<FlatLayEditorModalProps> = ({
  outfit,
  anchorName,
  palette,
  onClose,
  onUpdateOutfit,
}) => {
  const [editPrompt, setEditPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>(outfit?.aspectRatio || '3:4');
  const [imageSize, setImageSize] = useState<ImageResolution>(outfit?.imageSize || '1K');
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  if (!outfit) return null;

  const suggestions = QUICK_EDIT_PROMPTS[outfit.occasion] || QUICK_EDIT_PROMPTS.Casual;

  const handleApplyPromptEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim()) {
      setValidationError('Please enter a styling or image edit instruction before applying.');
      return;
    }

    setValidationError(null);
    setFeedbackBanner(null);
    setIsGenerating(true);

    const { updatedPieces, updatedSubtitle, addedColorHex } = applyPromptEditToOutfitPieces(
      outfit,
      editPrompt
    );

    const fullPrompt = buildFlatLayGenerationPrompt(
      anchorName,
      outfit.occasion,
      updatedPieces,
      editPrompt
    );

    try {
      // If current image is a data URL, send it as reference image for editing
      let referenceImageBase64: string | undefined;
      let referenceMimeType: string | undefined;
      if (outfit.flatLayImageUrl.startsWith('data:image/png;base64,') || outfit.flatLayImageUrl.startsWith('data:image/jpeg;base64,')) {
        const match = outfit.flatLayImageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          referenceMimeType = match[1];
          referenceImageBase64 = match[2];
        }
      }

      const response = await fetch('/api/stylist/image-banana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          referenceImageBase64,
          referenceMimeType,
          aspectRatio,
          imageSize,
          useGoogleSearch,
        }),
      });

      const data = await response.json();

      const finalImageUrl =
        data.ok && data.imageUrl
          ? data.imageUrl
          : generateBespokeFlatLaySvgDataUrl({
              occasion: outfit.occasion,
              editorialTitle: outfit.editorialTitle,
              anchorName,
              pieces: updatedPieces,
              palette,
              editNote: editPrompt.trim(),
              aspectRatio,
            });

      const modelLabel =
        data.ok && data.imageUrl
          ? 'gemini-nano-banana-2.1'
          : 'gemini-nano-banana-2.1 (Studio Composite)';

      const nextHarmony = addedColorHex
        ? Array.from(new Set([addedColorHex, ...outfit.harmonySwatches])).slice(0, 4)
        : outfit.harmonySwatches;

      const updatedOutfit: OutfitOption = {
        ...outfit,
        subtitle: updatedSubtitle,
        flatLayPrompt: fullPrompt,
        flatLayImageUrl: finalImageUrl,
        aspectRatio,
        imageSize,
        pieces: updatedPieces,
        harmonySwatches: nextHarmony,
        editHistory: [
          {
            id: `edit-${Date.now()}`,
            prompt: editPrompt.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            imageUrl: finalImageUrl,
            aspectRatio,
            imageSize,
            modelUsed: modelLabel,
          },
          ...outfit.editHistory,
        ],
      };

      onUpdateOutfit(updatedOutfit);
      setFeedbackBanner(
        data.ok && data.imageUrl
          ? `Rendered new ${imageSize} (${aspectRatio}) flat-lay with gemini-nano-banana-2.1.`
          : `Updated flat-lay studio arrangement & piece breakdown for "${editPrompt.trim()}".`
      );
      setEditPrompt('');
    } catch {
      const fallbackUrl = generateBespokeFlatLaySvgDataUrl({
        occasion: outfit.occasion,
        editorialTitle: outfit.editorialTitle,
        anchorName,
        pieces: updatedPieces,
        palette,
        editNote: editPrompt.trim(),
        aspectRatio,
      });

      const updatedOutfit: OutfitOption = {
        ...outfit,
        subtitle: updatedSubtitle,
        flatLayPrompt: fullPrompt,
        flatLayImageUrl: fallbackUrl,
        aspectRatio,
        imageSize,
        pieces: updatedPieces,
        editHistory: [
          {
            id: `edit-${Date.now()}`,
            prompt: editPrompt.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            imageUrl: fallbackUrl,
            aspectRatio,
            imageSize,
            modelUsed: 'Studio Composite',
          },
          ...outfit.editHistory,
        ],
      };
      onUpdateOutfit(updatedOutfit);
      setFeedbackBanner(`Updated flat-lay studio arrangement for "${editPrompt.trim()}".`);
      setEditPrompt('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flatlay-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-[#FAF8F5] border border-[#E4DFD5] rounded-2xl max-w-5xl w-full overflow-hidden shadow-xl my-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-[#F2EFE9] border-b border-[#E4DFD5]">
          <div>
            <p className="text-xs text-[#5E5850]">
              {outfit.occasion} Flat-Lay Studio · Powered by{' '}
              <span className="font-mono-tabular text-[#181615]">gemini-nano-banana-2.1</span>
            </p>
            <h2
              id="flatlay-editor-title"
              className="font-serif-display text-2xl font-semibold text-[#181615]"
            >
              Edit & Customize: {outfit.editorialTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Flat-Lay Editor"
            className="p-2 text-[#5E5850] hover:text-[#181615] rounded-lg hover:bg-[#E4DFD5]/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* 2-Column Split: Left Canvas Preview, Right Prompt & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Preview Column */}
          <div className="lg:col-span-5 p-6 bg-[#F2EFE9]/50 border-b lg:border-b-0 lg:border-r border-[#E4DFD5] flex flex-col justify-between gap-4">
            <div className="relative rounded-xl overflow-hidden border border-[#E4DFD5] bg-[#F2EFE9] aspect-[3/4] flex items-center justify-center">
              <img
                src={outfit.flatLayImageUrl}
                alt={outfit.editorialTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {isGenerating && (
                <div className="absolute inset-0 bg-[#181615]/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-[#FAF8F5]">
                  <Sparkles className="w-7 h-7 text-[#C59B41] mb-2 animate-spin" aria-hidden="true" />
                  <p className="font-serif-display text-xl italic">
                    Rendering Flat-Lay with gemini-nano-banana-2.1...
                  </p>
                  <p className="text-xs text-[#E4DFD5] mt-1">
                    Applying prompt modifications at {imageSize} ({aspectRatio})
                  </p>
                </div>
              )}
            </div>

            <div className="text-xs text-[#5E5850] space-y-1">
              <p className="font-semibold text-[#181615]">Active Flat-Lay Prompt</p>
              <p className="text-[11px] leading-relaxed line-clamp-3">{outfit.flatLayPrompt}</p>
            </div>
          </div>

          {/* Right Controls & Piece Breakdown */}
          <div className="lg:col-span-7 p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleApplyPromptEdit} className="space-y-4">
              <div>
                <label
                  htmlFor="flatlay-edit-prompt-input"
                  className="block text-xs font-semibold text-[#181615] mb-1.5"
                >
                  Describe Your Styling or Image Edit (gemini-nano-banana-2.1)
                </label>
                <textarea
                  id="flatlay-edit-prompt-input"
                  rows={3}
                  value={editPrompt}
                  onChange={(e) => {
                    setEditPrompt(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g., Swap the footwear for strappy gold metallic heels and add an emerald clutch..."
                  className="w-full rounded-lg border border-[#D4CEC3] bg-white px-3.5 py-2.5 text-sm text-[#181615] placeholder:text-[#8C8479] focus:border-[#181615] focus:outline-none"
                />
                {validationError && (
                  <p role="alert" className="text-xs text-[#9E472A] font-medium mt-1.5">
                    {validationError}
                  </p>
                )}
              </div>

              {/* Quick Refinement Prompt Buttons */}
              <div>
                <span className="block text-[11px] font-medium text-[#5E5850] mb-2">
                  Quick Stylist Refinements (Click to populate):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setEditPrompt(suggestion);
                        setValidationError(null);
                      }}
                      className="text-left text-xs px-2.5 py-1.5 rounded-md bg-[#F2EFE9] text-[#3D3833] hover:bg-[#E4DFD5] hover:text-[#181615] transition-colors cursor-pointer"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution & Aspect Ratio Config for gemini-nano-banana-2.1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E4DFD5]">
                <div>
                  <span className="block text-xs font-semibold text-[#181615] mb-1.5">
                    Aspect Ratio
                  </span>
                  <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAspectRatio(ratio)}
                        className={`flex-1 py-1.5 text-xs font-mono-tabular font-medium rounded-md transition-colors cursor-pointer ${
                          aspectRatio === ratio
                            ? 'bg-[#FAF8F5] text-[#181615] shadow-xs'
                            : 'text-[#5E5850] hover:text-[#181615]'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-[#181615] mb-1.5">
                    Resolution (gemini-nano-banana-2.1)
                  </span>
                  <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg">
                    {RESOLUTIONS.map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setImageSize(res)}
                        className={`flex-1 py-1.5 text-xs font-mono-tabular font-medium rounded-md transition-colors cursor-pointer ${
                          imageSize === res
                            ? 'bg-[#FAF8F5] text-[#181615] shadow-xs'
                            : 'text-[#5E5850] hover:text-[#181615]'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-[#5E5850] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useGoogleSearch}
                    onChange={(e) => setUseGoogleSearch(e.target.checked)}
                    className="rounded border-[#D4CEC3] text-[#181615] focus:ring-[#181615]"
                  />
                  <span>Enable Google Image Search grounding for trend references</span>
                </label>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#181615] rounded-lg hover:bg-[#2E2A27] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isGenerating ? 'Rendering Flat-Lay...' : 'Apply Flat-Lay Edit'}</span>
                </button>
              </div>
            </form>

            {feedbackBanner && (
              <div
                role="status"
                className="flex items-center gap-2 p-3 rounded-lg bg-[#F2EFE9] border border-[#D4CEC3] text-xs text-[#181615]"
              >
                <Check className="w-4 h-4 text-[#1B5E49] shrink-0" aria-hidden="true" />
                <span>{feedbackBanner}</span>
              </div>
            )}

            {/* Current Piece-by-Piece List */}
            <div className="pt-4 border-t border-[#E4DFD5]">
              <h3 className="text-xs font-semibold text-[#181615] mb-2.5">
                Current Flat-Lay Pieces ({outfit.pieces.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {outfit.pieces.map((piece) => (
                  <div
                    key={piece.id}
                    className="p-3 rounded-lg bg-[#F2EFE9]/70 border border-[#E4DFD5] flex items-start gap-2.5"
                  >
                    <span
                      className="w-4 h-4 rounded-xs border border-[#181615]/20 mt-0.5 shrink-0"
                      style={{ backgroundColor: piece.colorHex }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#181615] truncate">{piece.name}</p>
                      <p className="text-[11px] text-[#5E5850]">
                        {piece.category} · {piece.colorName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Version History */}
            {outfit.editHistory.length > 0 && (
              <div className="pt-4 border-t border-[#E4DFD5]">
                <h3 className="text-xs font-semibold text-[#181615] flex items-center gap-1.5 mb-2.5">
                  <History className="w-3.5 h-3.5 text-[#9E472A]" aria-hidden="true" />
                  <span>Flat-Lay Edit History ({outfit.editHistory.length})</span>
                </h3>
                <ul className="space-y-2">
                  {outfit.editHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#F2EFE9] text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#181615] truncate">“{entry.prompt}”</p>
                        <p className="text-[11px] text-[#7D756B] font-mono-tabular">
                          {entry.timestamp} · {entry.aspectRatio} · {entry.imageSize} · {entry.modelUsed}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateOutfit({
                            ...outfit,
                            flatLayImageUrl: entry.imageUrl,
                            aspectRatio: entry.aspectRatio,
                            imageSize: entry.imageSize,
                          })
                        }
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#181615] bg-[#FAF8F5] border border-[#D4CEC3] rounded-md hover:border-[#181615] shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>Restore</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
