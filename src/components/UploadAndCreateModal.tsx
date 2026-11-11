import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import {
  GarmentAnalysis,
  ImageAspectRatio,
  ImageResolution,
} from '../types/stylist';
import {
  buildCompleteAnalysisFromUpload,
  extractPaletteFromImageDataUrl,
} from '../utils/clientImageExtract';
import { generateBespokeFlatLaySvgDataUrl } from '../utils/stylistLogic';

interface UploadAndCreateModalProps {
  isOpen: boolean;
  initialTab: 'upload' | 'create';
  onClose: () => void;
  onGarmentCreated: (newGarment: GarmentAnalysis) => void;
}

const PROMPT_TEMPLATES = [
  {
    title: 'Burgundy & Mustard Houndstooth Wool Midi Skirt',
    category: 'Patterned Wool Skirt',
    prompt:
      'Overhead studio flat-lay product photography of a single garment: a burgundy oxblood, mustard gold, and ivory oversized houndstooth check wool A-line midi skirt laid flat on a warm linen studio surface, crisp tailoring, 8k commercial photography.',
  },
  {
    title: 'Chartreuse & Plum Paisley Velvet Blazer',
    category: 'Statement Outerwear',
    prompt:
      'Overhead studio flat-lay product photography of a single garment: a tailored single-breasted velvet blazer in rich damson plum and chartreuse green botanical paisley pattern laid flat on an alabaster stone background, 8k studio lighting.',
  },
  {
    title: 'Terracotta & Teal Polka-Dot Silk Palazzo Trousers',
    category: 'Printed Wide-Leg Trousers',
    prompt:
      'Overhead studio flat-lay product photography of a single garment: wide-leg silk palazzo trousers with an artistic terracotta sienna, deep teal, and cream abstract polka-dot motif laid flat on a neutral travertine surface.',
  },
];

export const UploadAndCreateModal: React.FC<UploadAndCreateModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  onGarmentCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'create'>(initialTab);
  const [garmentName, setGarmentName] = useState('');
  const [garmentCategory, setGarmentCategory] = useState('Patterned Midi Skirt');
  const [garmentNotes, setGarmentNotes] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('image/jpeg');

  // Create via gemini-nano-banana-2.1 state
  const [createPrompt, setCreatePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageResolution>('1K');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setActiveTab(initialTab);
    setErrorMessage(null);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setPreviewMimeType(file.type || 'image/jpeg');
    if (!garmentName.trim()) {
      const cleaned = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      setGarmentName(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeUploadedGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewDataUrl && !garmentName.trim()) {
      setErrorMessage('Please upload a garment photo or enter a garment name to analyze.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const finalName = garmentName.trim() || 'Custom Uploaded Statement Piece';
      const extractedPalette = previewDataUrl
        ? await extractPaletteFromImageDataUrl(previewDataUrl)
        : [
            { hex: '#8A2B32', name: 'Oxblood Crimson', role: 'Dominant' as const, proportion: 40 },
            { hex: '#C59B41', name: 'Mustard Ochre', role: 'Secondary' as const, proportion: 28 },
            { hex: '#F3EFE6', name: 'Warm Alabaster', role: 'Neutral Base' as const, proportion: 18 },
            { hex: '#3A261E', name: 'Espresso Leather', role: 'Accent' as const, proportion: 9 },
            { hex: '#181615', name: 'Obsidian Ink', role: 'Metallic/Highlight' as const, proportion: 5 },
          ];

      const res = await fetch('/api/stylist/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: previewDataUrl || undefined,
          mimeType: previewMimeType,
          garmentTitle: finalName,
          garmentNotes,
        }),
      });

      const data = await res.json();

      const fallbackGarmentImage =
        previewDataUrl ||
        generateBespokeFlatLaySvgDataUrl({
          occasion: 'Casual',
          editorialTitle: finalName,
          anchorName: finalName,
          pieces: [],
          palette: extractedPalette,
          aspectRatio: '1:1',
        });

      const newAnalysis = buildCompleteAnalysisFromUpload({
        id: `custom-${Date.now()}`,
        garmentName: finalName,
        garmentCategory,
        garmentNotes,
        imageUrl: fallbackGarmentImage,
        extractedPalette,
        apiAnalysis: data.ok ? data.analysis : undefined,
      });

      onGarmentCreated(newAnalysis);
      onClose();
    } catch {
      setErrorMessage('Could not complete analysis. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateNewGarmentViaPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPrompt.trim()) {
      setErrorMessage('Please describe the garment you want to generate and style.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const title =
        garmentName.trim() ||
        createPrompt
          .trim()
          .replace(/^Overhead studio flat-lay product photography of a single garment:\s*/i, '')
          .slice(0, 48);

      // Step 1: Call gemini-nano-banana-2.1 to generate the anchor garment image
      const imgRes = await fetch('/api/stylist/image-banana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Overhead studio flat-lay product photography of a single garment on a clean warm linen background: ${createPrompt.trim()}`,
          aspectRatio,
          imageSize,
        }),
      });
      const imgData = await imgRes.json();

      const defaultPalette = [
        { hex: '#6E2638', name: 'Damson Bordeaux', role: 'Dominant' as const, proportion: 42 },
        { hex: '#B8963E', name: 'Chartreuse Ochre', role: 'Secondary' as const, proportion: 28 },
        { hex: '#F3EFE6', name: 'Warm Alabaster', role: 'Neutral Base' as const, proportion: 16 },
        { hex: '#8F4B2D', name: 'Spiced Sienna', role: 'Accent' as const, proportion: 9 },
        { hex: '#181615', name: 'Obsidian Ink', role: 'Metallic/Highlight' as const, proportion: 5 },
      ];

      const generatedImageUrl =
        imgData.ok && imgData.imageUrl
          ? imgData.imageUrl
          : generateBespokeFlatLaySvgDataUrl({
              occasion: 'Casual',
              editorialTitle: title,
              anchorName: title,
              pieces: [],
              palette: defaultPalette,
              aspectRatio: '1:1',
            });

      const extractedPalette =
        imgData.ok && imgData.imageUrl
          ? await extractPaletteFromImageDataUrl(imgData.imageUrl)
          : defaultPalette;

      // Step 2: Analyze & build the 3 outfits (Casual, Business, Night Out)
      const analyzeRes = await fetch('/api/stylist/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentTitle: title,
          garmentNotes: createPrompt.trim(),
        }),
      });
      const analyzeData = await analyzeRes.json();

      const newAnalysis = buildCompleteAnalysisFromUpload({
        id: `prompt-${Date.now()}`,
        garmentName: title,
        garmentCategory,
        garmentNotes: createPrompt.trim(),
        imageUrl: generatedImageUrl,
        extractedPalette,
        apiAnalysis: analyzeData.ok ? analyzeData.analysis : undefined,
      });

      onGarmentCreated(newAnalysis);
      onClose();
    } catch {
      setErrorMessage('Failed to generate garment from prompt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-[#FAF8F5] border border-[#E4DFD5] rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F2EFE9] border-b border-[#E4DFD5]">
          <div>
            <p className="text-xs text-[#5E5850]">
              Chromatic Extraction & 3-Occasion Flat-Lay Generator
            </p>
            <h2
              id="upload-modal-title"
              className="font-serif-display text-2xl font-semibold text-[#181615]"
            >
              Add a Difficult-to-Match Garment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-[#5E5850] hover:text-[#181615] rounded-lg hover:bg-[#E4DFD5]/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Interactive Mode Switcher Tabs */}
        <div className="px-6 pt-4 bg-[#FAF8F5]">
          <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg">
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-[#FAF8F5] text-[#181615] shadow-xs'
                  : 'text-[#5E5850] hover:text-[#181615]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Upload Garment Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-[#FAF8F5] text-[#181615] shadow-xs'
                  : 'text-[#5E5850] hover:text-[#181615]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#9E472A]" aria-hidden="true" />
              <span>Create Image via Prompt (gemini-nano-banana-2.1)</span>
            </button>
          </div>
        </div>

        {activeTab === 'upload' ? (
          <form onSubmit={handleAnalyzeUploadedGarment} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="garment-photo-upload"
                className="block text-xs font-semibold text-[#181615] mb-1.5"
              >
                Garment Photo (JPG, PNG, WebP)
              </label>
              <input
                ref={fileInputRef}
                id="garment-photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D4CEC3] hover:border-[#181615] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#F2EFE9]/50"
              >
                {previewDataUrl ? (
                  <div className="flex items-center gap-4 text-left">
                    <img
                      src={previewDataUrl}
                      alt="Uploaded garment preview"
                      className="w-20 h-20 object-cover rounded-lg border border-[#E4DFD5]"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#181615]">
                        Garment Photo Ready for Palette Analysis
                      </p>
                      <p className="text-xs text-[#5E5850] mt-0.5">
                        Click to choose a different image file
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2">
                    <ImageIcon className="w-8 h-8 text-[#7D756B] mb-2" aria-hidden="true" />
                    <p className="text-xs font-semibold text-[#181615]">
                      Click to select a photo of your garment
                    </p>
                    <p className="text-[11px] text-[#5E5850] mt-0.5">
                      e.g., a patterned midi skirt, printed silk blouse, or textured blazer
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="upload-garment-name"
                  className="block text-xs font-semibold text-[#181615] mb-1"
                >
                  Garment Title
                </label>
                <input
                  id="upload-garment-name"
                  type="text"
                  value={garmentName}
                  onChange={(e) => setGarmentName(e.target.value)}
                  placeholder="e.g., Vintage Paisley Midi Skirt"
                  className="w-full rounded-lg border border-[#D4CEC3] bg-white px-3 py-2 text-xs text-[#181615] focus:border-[#181615] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="upload-garment-category"
                  className="block text-xs font-semibold text-[#181615] mb-1"
                >
                  Garment Category
                </label>
                <select
                  id="upload-garment-category"
                  value={garmentCategory}
                  onChange={(e) => setGarmentCategory(e.target.value)}
                  className="w-full rounded-lg border border-[#D4CEC3] bg-white px-3 py-2 text-xs text-[#181615] focus:border-[#181615] focus:outline-none"
                >
                  <option value="Patterned Midi Skirt">Patterned Midi Skirt</option>
                  <option value="Printed Silk Blouse">Printed Silk Blouse</option>
                  <option value="Statement Trousers">Statement Trousers</option>
                  <option value="Textured Blazer / Jacket">Textured Blazer / Jacket</option>
                  <option value="Patterned Dress">Patterned Dress</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="upload-garment-notes"
                className="block text-xs font-semibold text-[#181615] mb-1"
              >
                Fabric or Styling Notes (Optional)
              </label>
              <input
                id="upload-garment-notes"
                type="text"
                value={garmentNotes}
                onChange={(e) => setGarmentNotes(e.target.value)}
                placeholder="e.g., Silk brocade with emerald, ochre, and cream threads"
                className="w-full rounded-lg border border-[#D4CEC3] bg-white px-3 py-2 text-xs text-[#181615] focus:border-[#181615] focus:outline-none"
              />
            </div>

            {errorMessage && (
              <p role="alert" className="text-xs font-medium text-[#9E472A]">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4DFD5]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#5E5850] hover:text-[#181615] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#181615] rounded-lg hover:bg-[#2E2A27] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isProcessing
                  ? 'Analyzing Palette & Building 3 Looks...'
                  : 'Analyze & Generate 3 Outfits'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleGenerateNewGarmentViaPrompt} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="create-garment-prompt"
                className="block text-xs font-semibold text-[#181615] mb-1"
              >
                Describe the Garment to Create (gemini-nano-banana-2.1)
              </label>
              <textarea
                id="create-garment-prompt"
                rows={3}
                value={createPrompt}
                onChange={(e) => {
                  setCreatePrompt(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Describe any tricky pattern, color combination, or silhouette..."
                className="w-full rounded-lg border border-[#D4CEC3] bg-white px-3.5 py-2.5 text-xs text-[#181615] focus:border-[#181615] focus:outline-none"
              />
            </div>

            {/* Preset Challenging Garment Prompts */}
            <div>
              <span className="block text-[11px] font-medium text-[#5E5850] mb-1.5">
                Or try a Challenging Statement Piece preset:
              </span>
              <div className="space-y-1.5">
                {PROMPT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => {
                      setGarmentName(tpl.title);
                      setGarmentCategory(tpl.category);
                      setCreatePrompt(tpl.prompt);
                      setErrorMessage(null);
                    }}
                    className="w-full text-left p-2.5 rounded-lg bg-[#F2EFE9] hover:bg-[#E4DFD5] transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-[#181615]">{tpl.title}</p>
                    <p className="text-[11px] text-[#5E5850] truncate">{tpl.prompt}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="prompt-garment-title"
                  className="block text-xs font-semibold text-[#181615] mb-1"
                >
                  Garment Name
                </label>
                <input
                  id="prompt-garment-title"
                  type="text"
                  value={garmentName}
                  onChange={(e) => setGarmentName(e.target.value)}
                  placeholder="e.g., Burgundy Houndstooth Skirt"
                  className="w-full rounded-lg border border-[#D4CEC3] bg-white px-3 py-2 text-xs text-[#181615]"
                />
              </div>
              <div>
                <label
                  htmlFor="prompt-aspect-ratio"
                  className="block text-xs font-semibold text-[#181615] mb-1"
                >
                  Aspect Ratio
                </label>
                <select
                  id="prompt-aspect-ratio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)}
                  className="w-full rounded-lg border border-[#D4CEC3] bg-white px-3 py-2 text-xs font-mono-tabular text-[#181615]"
                >
                  <option value="1:1">1:1 (Square Studio)</option>
                  <option value="3:4">3:4 (Editorial Portrait)</option>
                  <option value="4:3">4:3 (Archive Card)</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="prompt-resolution"
                  className="block text-xs font-semibold text-[#181615] mb-1"
                >
                  Resolution
                </label>
                <select
                  id="prompt-resolution"
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as ImageResolution)}
                  className="w-full rounded-lg border border-[#D4CEC3] bg-white px-3 py-2 text-xs font-mono-tabular text-[#181615]"
                >
                  <option value="1K">1K Standard</option>
                  <option value="2K">2K High-Res</option>
                  <option value="4K">4K Ultra Archive</option>
                </select>
              </div>
            </div>

            {errorMessage && (
              <p role="alert" className="text-xs font-medium text-[#9E472A]">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4DFD5]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#5E5850] hover:text-[#181615] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#9E472A] rounded-lg hover:bg-[#843920] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {isProcessing ? 'Generating 3 Looks...' : 'Generate Garment & 3 Outfits'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
