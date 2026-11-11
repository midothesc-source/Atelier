import React, { useState, useMemo } from 'react';
import { Sparkles, Upload, Wand2, X, Check } from 'lucide-react';
import { SAMPLE_GARMENTS } from './data/sampleGarments';
import {
  GarmentAnalysis,
  OccasionType,
  OutfitOption,
  SavedLookbookItem,
} from './types/stylist';
import {
  filterOutfitsByOccasion,
  toggleSavedLookbookItem,
} from './utils/stylistLogic';
import { Header } from './components/Header';
import { GarmentInspector } from './components/GarmentInspector';
import { OutfitCard } from './components/OutfitCard';
import { FlatLayEditorModal } from './components/FlatLayEditorModal';
import { UploadAndCreateModal } from './components/UploadAndCreateModal';
import { LookbookDrawer } from './components/LookbookDrawer';

export default function App() {
  const [garments, setGarments] = useState<GarmentAnalysis[]>(SAMPLE_GARMENTS);
  const [activeGarmentId, setActiveGarmentId] = useState<string>(SAMPLE_GARMENTS[0].id);
  const [occasionFilter, setOccasionFilter] = useState<'All' | OccasionType>('All');
  const [activeSection, setActiveSection] = useState<'studio' | 'archive' | 'image-lab' | 'lookbook'>('studio');

  // Modals & Drawers
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [zoomedOutfit, setZoomedOutfit] = useState<OutfitOption | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalTab, setUploadModalTab] = useState<'upload' | 'create'>('upload');
  const [lookbookOpen, setLookbookOpen] = useState(false);

  // Saved Lookbook
  const [savedLookbook, setSavedLookbook] = useState<SavedLookbookItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeGarment = useMemo(
    () => garments.find((g) => g.id === activeGarmentId) || garments[0],
    [garments, activeGarmentId]
  );

  const visibleOutfits = useMemo(
    () => filterOutfitsByOccasion(activeGarment.outfits, occasionFilter),
    [activeGarment.outfits, occasionFilter]
  );

  const editingOutfit = useMemo(
    () => activeGarment.outfits.find((o) => o.id === editingOutfitId) || null,
    [activeGarment.outfits, editingOutfitId]
  );

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleToggleSaveLookbook = (outfit: OutfitOption) => {
    const { nextList, wasAdded } = toggleSavedLookbookItem(
      savedLookbook,
      { name: activeGarment.name, imageUrl: activeGarment.imageUrl },
      outfit
    );
    setSavedLookbook(nextList);
    triggerToast(
      wasAdded
        ? `Saved "${outfit.editorialTitle}" (${outfit.occasion}) to Lookbook.`
        : `Removed "${outfit.editorialTitle}" from Lookbook.`
    );
  };

  const handleUpdateOutfit = (updatedOutfit: OutfitOption) => {
    setGarments((prev) =>
      prev.map((garment) => {
        if (garment.id !== activeGarment.id) return garment;
        return {
          ...garment,
          outfits: garment.outfits.map((o) => (o.id === updatedOutfit.id ? updatedOutfit : o)),
        };
      })
    );
    // Also update in saved lookbook if present
    setSavedLookbook((prev) =>
      prev.map((item) =>
        item.outfit.id === updatedOutfit.id ? { ...item, outfit: updatedOutfit } : item
      )
    );
  };

  const handleGarmentCreated = (newGarment: GarmentAnalysis) => {
    setGarments((prev) => [newGarment, ...prev]);
    setActiveGarmentId(newGarment.id);
    setOccasionFilter('All');
    setActiveSection('studio');
    triggerToast(`Analyzed "${newGarment.name}" and generated Casual, Business, and Night Out flat-lays.`);
  };

  const handleHeaderNavigate = (section: 'studio' | 'archive' | 'image-lab' | 'lookbook') => {
    setActiveSection(section);
    if (section === 'lookbook') {
      setLookbookOpen(true);
    } else if (section === 'archive') {
      const el = document.getElementById('sample-archive-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'studio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#181615]">
      <Header
        activeSection={activeSection}
        savedCount={savedLookbook.length}
        onNavigate={handleHeaderNavigate}
        onOpenUploadModal={(tab = 'upload') => {
          setUploadModalTab(tab);
          setUploadModalOpen(true);
        }}
      />

      {/* Subtle Toast Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#181615] text-[#FAF8F5] text-xs font-medium shadow-lg border border-[#3D3833]"
        >
          <Check className="w-4 h-4 text-[#C59B41] shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 lg:px-10 py-8 space-y-12">
        {/* Editorial Intro Banner */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E4DFD5]">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium text-[#9E472A] tracking-wide">
              Chromatic Wardrobe Diagnostics · Flat-Lay Studio Visualization
            </p>
            <h1 className="font-serif-display text-4xl sm:text-5xl font-semibold text-[#181615] tracking-tight leading-[1.08] text-balance">
              Solve the “I Don’t Know What to Wear With This” Dilemma.
            </h1>
            <p className="text-sm text-[#5E5850] leading-relaxed pt-1">
              Upload a photo of any challenging piece—a patterned jacquard midi skirt, a bold
              geometric silk blouse, or statement tailoring—or create one from a text prompt. Our
              stylist extracts its exact color harmonies and composes 3 distinct{' '}
              <strong className="font-semibold text-[#181615]">Casual</strong>,{' '}
              <strong className="font-semibold text-[#181615]">Business</strong>, and{' '}
              <strong className="font-semibold text-[#181615]">Night Out</strong> flat-lay outfits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setUploadModalTab('upload');
                setUploadModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#181615] rounded-lg hover:bg-[#2E2A27] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Upload Your Garment Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadModalTab('create');
                setUploadModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#181615] bg-[#F2EFE9] border border-[#D4CEC3] rounded-lg hover:border-[#181615] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#9E472A]" aria-hidden="true" />
              <span>Create Garment via Prompt</span>
            </button>
          </div>
        </section>

        {/* Main 12-Column Studio Workspace: 4-Col Anchor Garment Inspector + 8-Col 3-Outfit Flat-Lay Grid */}
        <section
          aria-label="Virtual Stylist Workspace"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Left 4 Columns: Anchor Garment & Palette Inspector */}
          <div className="lg:col-span-4">
            <GarmentInspector
              activeGarment={activeGarment}
              allGarments={garments}
              onSelectGarment={(id) => {
                setActiveGarmentId(id);
                setOccasionFilter('All');
              }}
              onOpenUploadModal={(tab) => {
                setUploadModalTab(tab);
                setUploadModalOpen(true);
              }}
              isAnalyzing={false}
            />
          </div>

          {/* Right 8 Columns: 3 Complete Distinct Flat-Lay Outfit Options */}
          <div className="lg:col-span-8 space-y-6">
            {/* Workspace Toolbar: Occasion Filter & AI Edit Shortcut */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#F2EFE9] border border-[#E4DFD5]">
              <div>
                <h2 className="font-serif-display text-2xl font-semibold text-[#181615]">
                  02. Complete Flat-Lay Outfit Options
                </h2>
                <p className="text-xs text-[#5E5850]">
                  Featuring <span className="font-semibold text-[#181615]">{activeGarment.name}</span>{' '}
                  across 3 distinct dress codes
                </p>
              </div>

              {/* Interactive Filter Controls (Functional Buttons) */}
              <div
                role="group"
                aria-label="Filter outfits by occasion"
                className="flex items-center gap-1 p-1 bg-[#E4DFD5]/80 rounded-lg self-start sm:self-auto"
              >
                {(['All', 'Casual', 'Business', 'Night Out'] as const).map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setOccasionFilter(occ)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      occasionFilter === occ
                        ? 'bg-[#FAF8F5] text-[#181615] shadow-xs'
                        : 'text-[#5E5850] hover:text-[#181615]'
                    }`}
                  >
                    {occ === 'All' ? 'All 3 Looks' : occ}
                  </button>
                ))}
              </div>
            </div>

            {/* 3-Outfit Flat-Lay Grid */}
            <div
              className={`grid grid-cols-1 ${
                visibleOutfits.length === 1
                  ? 'md:grid-cols-1 max-w-xl'
                  : 'md:grid-cols-2 xl:grid-cols-3'
              } gap-6`}
            >
              {visibleOutfits.map((outfit, idx) => {
                const isSaved = savedLookbook.some((item) => item.outfit.id === outfit.id);
                return (
                  <OutfitCard
                    key={outfit.id}
                    index={idx}
                    outfit={outfit}
                    isSaved={isSaved}
                    onToggleSave={handleToggleSaveLookbook}
                    onOpenEditor={(targetOutfit) => setEditingOutfitId(targetOutfit.id)}
                    onInspectZoom={(targetOutfit) => setZoomedOutfit(targetOutfit)}
                  />
                );
              })}
            </div>

            {/* AI Flat-Lay Image Prompt Studio Banner */}
            <div className="p-6 rounded-xl bg-[#F2EFE9] border border-[#E4DFD5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#9E472A]">
                  Create & Edit Flat-Lay Images · gemini-nano-banana-2.1
                </p>
                <h3 className="font-serif-display text-xl font-semibold text-[#181615]">
                  Want to swap shoes, test a different jacket, or change the lighting?
                </h3>
                <p className="text-xs text-[#5E5850]">
                  Click “Edit Flat-Lay with AI” on any card above to modify pieces with natural
                  language prompts at 1K, 2K, or 4K resolution.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOutfitId(activeGarment.outfits[0].id)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#181615] rounded-lg hover:bg-[#2E2A27] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#C59B41]" aria-hidden="true" />
                <span>Open Flat-Lay Prompt Editor</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Sample Difficult-to-Match Archive */}
        <section
          id="sample-archive-section"
          aria-label="Sample Challenging Garment Archive"
          className="pt-8 border-t border-[#E4DFD5] space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs text-[#5E5850]">Curated Styling Case Studies</p>
              <h2 className="font-serif-display text-3xl font-semibold text-[#181615]">
                03. Difficult-to-Match Garment Archive
              </h2>
            </div>
            <p className="text-xs text-[#5E5850] max-w-md">
              Select any garment in the archive to inspect its extracted 5-swatch pigment breakdown
              and 3 complete flat-lay outfits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {garments.map((item, idx) => {
              const isCurrent = item.id === activeGarment.id;
              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-xl border transition-colors flex flex-col sm:flex-row gap-5 items-start ${
                    isCurrent
                      ? 'bg-[#F2EFE9] border-[#181615]'
                      : 'bg-[#FAF8F5] border-[#E4DFD5] hover:bg-[#F2EFE9]/60'
                  }`}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-28 h-28 rounded-lg object-cover border border-[#E4DFD5] shrink-0 bg-[#E4DFD5]"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-[#5E5850]">
                      <span className="font-mono-tabular font-semibold text-[#9E472A]">
                        0{idx + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.patternComplexity}</span>
                    </div>
                    <h3 className="font-serif-display text-xl font-semibold text-[#181615]">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#5E5850] line-clamp-2">{item.stylingChallenge}</p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5">
                        {item.palette.map((sw) => (
                          <span
                            key={sw.hex + sw.name}
                            className="w-4 h-4 rounded-xs border border-[#181615]/15"
                            style={{ backgroundColor: sw.hex }}
                            title={`${sw.name} (${sw.hex})`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveGarmentId(item.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#181615] text-[#FAF8F5]'
                            : 'bg-[#FAF8F5] text-[#181615] border border-[#D4CEC3] hover:border-[#181615]'
                        }`}
                      >
                        {isCurrent ? 'Currently Viewing' : 'Load 3 Flat-Lay Outfits'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E4DFD5] bg-[#F2EFE9] px-6 lg:px-10 py-6 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5E5850]">
          <p className="font-serif-display text-base font-semibold text-[#181615]">
            Atelier Flat-Lay — Virtual Wardrobe Stylist
          </p>
          <p>
            Chromatic harmony analysis & overhead knolling visualization · Casual · Business · Night
            Out
          </p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <FlatLayEditorModal
        outfit={editingOutfit}
        anchorName={activeGarment.name}
        palette={activeGarment.palette}
        onClose={() => setEditingOutfitId(null)}
        onUpdateOutfit={handleUpdateOutfit}
      />

      <UploadAndCreateModal
        isOpen={uploadModalOpen}
        initialTab={uploadModalTab}
        onClose={() => setUploadModalOpen(false)}
        onGarmentCreated={handleGarmentCreated}
      />

      <LookbookDrawer
        isOpen={lookbookOpen}
        savedItems={savedLookbook}
        onClose={() => setLookbookOpen(false)}
        onRemoveItem={(id) =>
          setSavedLookbook((prev) => prev.filter((item) => item.id !== id))
        }
        onOpenEditor={(outfit) => setEditingOutfitId(outfit.id)}
      />

      {/* Full-Screen Flat-Lay Lightbox Inspection Modal */}
      {zoomedOutfit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomedOutfit.occasion} Flat-Lay Full View`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-black/80 backdrop-blur-xs"
        >
          <div className="bg-[#FAF8F5] rounded-2xl max-w-4xl w-full overflow-hidden border border-[#E4DFD5] grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-7 bg-[#F2EFE9] flex items-center justify-center max-h-[82vh] overflow-hidden">
              <img
                src={zoomedOutfit.flatLayImageUrl}
                alt={zoomedOutfit.editorialTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain max-h-[82vh]"
              />
            </div>
            <div className="md:col-span-5 p-6 flex flex-col justify-between max-h-[82vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#9E472A]">
                    {zoomedOutfit.occasion} · {zoomedOutfit.dressCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomedOutfit(null)}
                    aria-label="Close full-screen inspection"
                    className="p-1.5 text-[#5E5850] hover:text-[#181615] rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
                <h2 className="font-serif-display text-2xl font-semibold text-[#181615]">
                  {zoomedOutfit.editorialTitle}
                </h2>
                <p className="text-xs text-[#5E5850] leading-relaxed">
                  {zoomedOutfit.stylistRationale}
                </p>

                <div className="pt-3 border-t border-[#E4DFD5] space-y-2.5">
                  <p className="text-xs font-semibold text-[#181615]">Complete Flat-Lay Pieces</p>
                  {zoomedOutfit.pieces.map((p) => (
                    <div key={p.id} className="flex items-start gap-2 text-xs">
                      <span
                        className="w-3.5 h-3.5 rounded-xs border border-[#181615]/20 mt-0.5 shrink-0"
                        style={{ backgroundColor: p.colorHex }}
                      />
                      <div>
                        <p className="font-semibold text-[#181615]">{p.name}</p>
                        <p className="text-[11px] text-[#5E5850]">
                          {p.category} · {p.colorName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E4DFD5] flex items-center justify-between gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = zoomedOutfit.id;
                    setZoomedOutfit(null);
                    setEditingOutfitId(targetId);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#FAF8F5] bg-[#181615] rounded-lg cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#C59B41]" aria-hidden="true" />
                  <span>Edit Flat-Lay with AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomedOutfit(null)}
                  className="px-4 py-2 text-xs font-medium text-[#5E5850] hover:text-[#181615] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
