import React from 'react';

interface HeaderProps {
  activeSection: 'studio' | 'archive' | 'image-lab' | 'lookbook';
  savedCount: number;
  onNavigate: (section: 'studio' | 'archive' | 'image-lab' | 'lookbook') => void;
  onOpenUploadModal: (initialTab?: 'upload' | 'create') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  savedCount,
  onNavigate,
  onOpenUploadModal,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 lg:px-10 py-4 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E4DFD5]">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#studio"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('studio');
        }}
        className="font-serif-display text-2xl font-semibold tracking-tight text-[#181615] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#181615]"
      >
        Atelier Flat-Lay
      </a>

      {/* Zone 2: 4 concise single-line text navigation links */}
      <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5E5850]">
        <button
          type="button"
          onClick={() => onNavigate('studio')}
          className={`hover:text-[#181615] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
            activeSection === 'studio'
              ? 'text-[#181615] border-[#181615]'
              : 'border-transparent'
          }`}
        >
          Stylist Studio
        </button>
        <button
          type="button"
          onClick={() => onNavigate('archive')}
          className={`hover:text-[#181615] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
            activeSection === 'archive'
              ? 'text-[#181615] border-[#181615]'
              : 'border-transparent'
          }`}
        >
          Sample Archive
        </button>
        <button
          type="button"
          onClick={() => {
            onNavigate('image-lab');
            onOpenUploadModal('create');
          }}
          className={`hover:text-[#181615] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
            activeSection === 'image-lab'
              ? 'text-[#181615] border-[#181615]'
              : 'border-transparent'
          }`}
        >
          Prompt Studio
        </button>
        <button
          type="button"
          onClick={() => onNavigate('lookbook')}
          className={`hover:text-[#181615] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 font-mono-tabular ${
            activeSection === 'lookbook'
              ? 'text-[#181615] border-[#181615]'
              : 'border-transparent'
          }`}
        >
          Lookbook ({savedCount})
        </button>
      </nav>

      {/* Zone 3: 1 primary action (plus mobile Lookbook access when center nav is hidden) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('lookbook')}
          className="md:hidden px-3 py-2 text-xs font-semibold text-[#181615] bg-[#F2EFE9] border border-[#D4CEC3] rounded-lg whitespace-nowrap shrink-0 font-mono-tabular cursor-pointer"
        >
          Lookbook ({savedCount})
        </button>
        <button
          type="button"
          onClick={() => onOpenUploadModal('upload')}
          className="px-4 py-2 text-xs font-semibold tracking-wide text-[#FAF8F5] bg-[#181615] rounded-lg hover:bg-[#2E2A27] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9E472A]"
        >
          Upload Garment
        </button>
      </div>
    </header>
  );
};
