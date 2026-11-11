import React, { useState } from 'react';
import { Sparkles, Bookmark, Maximize2, Wand2, Layers } from 'lucide-react';
import { OutfitOption } from '../types/stylist';

interface OutfitCardProps {
  index: number;
  outfit: OutfitOption;
  isSaved: boolean;
  onToggleSave: (outfit: OutfitOption) => void;
  onOpenEditor: (outfit: OutfitOption) => void;
  onInspectZoom: (outfit: OutfitOption) => void;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
  index,
  outfit,
  isSaved,
  onToggleSave,
  onOpenEditor,
  onInspectZoom,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const formattedIndex = String(index + 1).padStart(2, '0');

  return (
    <article
      aria-label={`${outfit.occasion} Flat-Lay Outfit: ${outfit.editorialTitle}`}
      className="bg-[#FAF8F5] border border-[#E4DFD5] rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div>
        {/* Card Editorial Header — Zero Static Pills */}
        <div className="p-5 pb-4 border-b border-[#E4DFD5]">
          <div className="flex items-center justify-between gap-2 text-xs text-[#5E5850] mb-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-mono-tabular font-semibold text-[#9E472A]">
                {formattedIndex}. {outfit.occasion}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{outfit.dressCode}</span>
            </div>
            <span className="font-mono-tabular text-[11px] text-[#7D756B] shrink-0">
              {outfit.aspectRatio} · {outfit.imageSize}
            </span>
          </div>

          <h3 className="font-serif-display text-2xl font-semibold text-[#181615] leading-tight">
            {outfit.editorialTitle}
          </h3>
          <p className="text-xs text-[#5E5850] mt-1 line-clamp-2">{outfit.subtitle}</p>
        </div>

        {/* Overhead Flat-Lay Visual Canvas */}
        <div className="relative aspect-[3/4] w-full bg-[#F2EFE9] border-b border-[#E4DFD5] group overflow-hidden">
          {!imageFailed ? (
            <img
              src={outfit.flatLayImageUrl}
              alt={`${outfit.occasion} flat-lay arrangement: ${outfit.editorialTitle}`}
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#F2EFE9] to-[#E4DFD5]">
              <Layers className="w-10 h-10 text-[#5E5850] mb-2" aria-hidden="true" />
              <p className="font-serif-display text-lg font-semibold text-[#181615]">
                {outfit.editorialTitle}
              </p>
              <p className="text-xs text-[#5E5850] mt-1">{outfit.colorHarmonyStrategy}</p>
            </div>
          )}

          {/* Measured Contrast Scrim Bottom Overlay for Studio Actions */}
          <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/80 via-black/45 to-transparent flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenEditor(outfit)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#181615] bg-[#FAF8F5] rounded-lg hover:bg-[#F2EFE9] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#9E472A]" aria-hidden="true" />
              <span>Edit Flat-Lay with AI</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onInspectZoom(outfit)}
                aria-label={`Inspect ${outfit.occasion} flat-lay full screen`}
                className="p-2 text-[#FAF8F5] bg-black/50 hover:bg-black/75 rounded-lg transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onToggleSave(outfit)}
                aria-label={
                  isSaved
                    ? `Remove ${outfit.occasion} look from Lookbook`
                    : `Save ${outfit.occasion} look to Lookbook`
                }
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-[#9E472A] text-[#FAF8F5]'
                    : 'bg-black/50 text-[#FAF8F5] hover:bg-black/75'
                }`}
              >
                <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Color Harmony Strategy & Swatch Strip */}
        <div className="p-5 pb-4 border-b border-[#E4DFD5] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#181615]">Color Harmony</span>
            <div className="flex items-center gap-1.5">
              {outfit.harmonySwatches.map((hex, i) => (
                <span
                  key={`${hex}-${i}`}
                  className="w-4 h-4 rounded-xs border border-[#181615]/20"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>
          <p className="text-xs font-medium text-[#9E472A]">{outfit.colorHarmonyStrategy}</p>
          <p className="text-xs text-[#5E5850] leading-relaxed">{outfit.stylistRationale}</p>
        </div>

        {/* Complete 5-Piece Flat-Lay Breakdown */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#5E5850]">
            <span className="font-semibold text-[#181615]">Flat-Lay Piece Breakdown</span>
            <span className="font-mono-tabular">{outfit.pieces.length} Pieces</span>
          </div>

          <ul className="divide-y divide-[#E4DFD5]">
            {outfit.pieces.map((piece) => (
              <li key={piece.id} className="py-2.5 first:pt-1 last:pb-0">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-xs border border-[#181615]/20 mt-0.5 shrink-0"
                      style={{ backgroundColor: piece.colorHex }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#181615] leading-snug">
                        {piece.name}
                      </p>
                      <p className="text-[11px] text-[#7D756B] mt-0.5">
                        {piece.category} · {piece.colorName} · {piece.material}
                      </p>
                      <p className="text-[11px] text-[#5E5850] mt-1 leading-normal">
                        {piece.stylingNote}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-5 py-3.5 bg-[#F2EFE9] border-t border-[#E4DFD5] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpenEditor(outfit)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#181615] hover:text-[#9E472A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#9E472A]" aria-hidden="true" />
          <span>Customize Pieces & Image ({outfit.editHistory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleSave(outfit)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isSaved
              ? 'bg-[#181615] text-[#FAF8F5]'
              : 'bg-[#FAF8F5] text-[#181615] border border-[#D4CEC3] hover:border-[#181615]'
          }`}
        >
          {isSaved ? 'Saved in Lookbook' : 'Save Look'}
        </button>
      </div>
    </article>
  );
};
