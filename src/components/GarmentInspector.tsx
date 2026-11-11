import React, { useState } from 'react';
import { Upload, Sparkles, Palette, Layers, Check } from 'lucide-react';
import { GarmentAnalysis } from '../types/stylist';

interface GarmentInspectorProps {
  activeGarment: GarmentAnalysis;
  allGarments: GarmentAnalysis[];
  onSelectGarment: (garmentId: string) => void;
  onOpenUploadModal: (initialTab: 'upload' | 'create') => void;
  isAnalyzing: boolean;
}

export const GarmentInspector: React.FC<GarmentInspectorProps> = ({
  activeGarment,
  allGarments,
  onSelectGarment,
  onOpenUploadModal,
  isAnalyzing,
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const handleCopyHex = (hex: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex).catch(() => {});
    }
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1600);
  };

  return (
    <aside aria-label="Anchor Garment Analysis" className="w-full space-y-6">
      {/* Sample Archive & Custom Garment Switcher */}
      <div className="bg-[#F2EFE9] border border-[#E4DFD5] rounded-xl p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold tracking-wide text-[#5E5850]">
            01. Anchor Garment Selection
          </span>
          <span className="text-xs text-[#7D756B] font-mono-tabular">
            {allGarments.length} Pieces Available
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 mb-4" role="radiogroup" aria-label="Select Anchor Garment">
          {allGarments.map((item) => {
            const isSelected = item.id === activeGarment.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setImgError(false);
                  onSelectGarment(item.id);
                }}
                aria-pressed={isSelected}
                className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#FAF8F5] border-[#181615] shadow-xs'
                    : 'bg-transparent border-transparent hover:bg-[#FAF8F5]/60'
                }`}
              >
                <div className="w-11 h-11 rounded-md overflow-hidden bg-[#E4DFD5] shrink-0 flex items-center justify-center">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#181615] truncate">{item.name}</p>
                  <p className="text-[11px] text-[#5E5850] truncate">
                    {item.category} · {item.palette[0]?.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E4DFD5]">
          <button
            type="button"
            onClick={() => onOpenUploadModal('upload')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-[#181615] bg-[#FAF8F5] border border-[#D4CEC3] rounded-lg hover:border-[#181615] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Upload Photo</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenUploadModal('create')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-[#FAF8F5] bg-[#9E472A] rounded-lg hover:bg-[#843920] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Prompt Garment</span>
          </button>
        </div>
      </div>

      {/* Main Anchor Garment Showcase & Diagnostics */}
      <div className="bg-[#FAF8F5] border border-[#E4DFD5] rounded-xl p-5 space-y-5">
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#F2EFE9] border border-[#E4DFD5]">
          {!imgError ? (
            <img
              src={activeGarment.imageUrl}
              alt={activeGarment.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#F2EFE9] to-[#E4DFD5]">
              <Layers className="w-10 h-10 text-[#5E5850] mb-2" aria-hidden="true" />
              <p className="font-serif-display text-lg font-semibold text-[#181615]">
                {activeGarment.name}
              </p>
              <p className="text-xs text-[#5E5850] mt-1">{activeGarment.fabricAndTexture}</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-[#181615]/60 backdrop-blur-xs flex flex-col items-center justify-center text-[#FAF8F5] p-6 text-center">
              <p className="font-serif-display text-xl italic">Analyzing Chromatic Structure...</p>
              <p className="text-xs text-[#E4DFD5] mt-1">
                Extracting pigment ratios and generating 3 flat-lay compositions
              </p>
            </div>
          )}
        </div>

        {/* Unboxed Editorial Metadata Header */}
        <div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5E5850] mb-1">
            <span>{activeGarment.category}</span>
            <span aria-hidden="true">·</span>
            <span>{activeGarment.patternComplexity}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">Versatility {activeGarment.versatilityScore}/100</span>
          </div>
          <h2 className="font-serif-display text-2xl font-semibold text-[#181615] leading-snug">
            {activeGarment.name}
          </h2>
        </div>

        {/* Extracted 5-Swatch Color Palette */}
        <div className="pt-4 border-t border-[#E4DFD5]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-[#181615] flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#9E472A]" aria-hidden="true" />
              <span>Extracted Chromatic Palette</span>
            </span>
            <span className="text-[11px] text-[#7D756B]">Click swatch to copy HEX</span>
          </div>

          {/* Proportional Color Bar */}
          <div className="h-4 w-full rounded-md overflow-hidden flex border border-[#E4DFD5] mb-3">
            {activeGarment.palette.map((swatch) => (
              <div
                key={swatch.hex + swatch.name}
                style={{
                  width: `${swatch.proportion}%`,
                  backgroundColor: swatch.hex,
                }}
                title={`${swatch.name} (${swatch.hex}) — ${swatch.proportion}%`}
              />
            ))}
          </div>

          {/* Individual Swatch Rows */}
          <div className="space-y-2">
            {activeGarment.palette.map((swatch) => (
              <button
                key={swatch.hex + swatch.role}
                type="button"
                onClick={() => handleCopyHex(swatch.hex)}
                aria-label={`Copy ${swatch.name} hex code ${swatch.hex}`}
                className="w-full flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-[#F2EFE9] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-5 h-5 rounded-xs border border-[#181615]/15 shrink-0"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#181615] truncate">{swatch.name}</p>
                    <p className="text-[11px] text-[#7D756B]">
                      {swatch.role} ·{' '}
                      <span className="font-mono-tabular">{swatch.proportion}%</span>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono-tabular text-[#5E5850] group-hover:text-[#181615] flex items-center gap-1 shrink-0">
                  {copiedHex === swatch.hex ? (
                    <>
                      <Check className="w-3 h-3 text-[#1B5E49]" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    swatch.hex
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Silhouette & Styling Verdict */}
        <div className="pt-4 border-t border-[#E4DFD5] space-y-3 text-xs leading-relaxed">
          <div>
            <p className="font-semibold text-[#181615] mb-0.5">Silhouette & Textile</p>
            <p className="text-[#5E5850]">
              {activeGarment.silhouette} · {activeGarment.fabricAndTexture}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#181615] mb-0.5">Why It’s Tricky to Match</p>
            <p className="text-[#5E5850]">{activeGarment.stylingChallenge}</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F2EFE9]">
            <p className="font-semibold text-[#181615] mb-1">Stylist Formula</p>
            <p className="text-[#3D3833]">{activeGarment.stylistVerdict}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
