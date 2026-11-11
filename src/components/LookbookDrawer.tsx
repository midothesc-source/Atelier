import React from 'react';
import { X, Trash2, Bookmark, Wand2 } from 'lucide-react';
import { OutfitOption, SavedLookbookItem } from '../types/stylist';

interface LookbookDrawerProps {
  isOpen: boolean;
  savedItems: SavedLookbookItem[];
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onOpenEditor: (outfit: OutfitOption) => void;
}

export const LookbookDrawer: React.FC<LookbookDrawerProps> = ({
  isOpen,
  savedItems,
  onClose,
  onRemoveItem,
  onOpenEditor,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lookbook-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs"
    >
      <div className="bg-[#FAF8F5] border-l border-[#E4DFD5] w-full max-w-lg h-full flex flex-col justify-between shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 bg-[#F2EFE9] border-b border-[#E4DFD5]">
          <div>
            <p className="text-xs text-[#5E5850] font-mono-tabular">
              Personal Wardrobe Archive · {savedItems.length} Saved Looks
            </p>
            <h2
              id="lookbook-drawer-title"
              className="font-serif-display text-2xl font-semibold text-[#181615]"
            >
              Saved Flat-Lay Lookbook
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Lookbook Drawer"
            className="p-2 text-[#5E5850] hover:text-[#181615] rounded-lg hover:bg-[#E4DFD5]/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {savedItems.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-xl border border-dashed border-[#D4CEC3] bg-[#F2EFE9]/40">
              <Bookmark className="w-8 h-8 text-[#7D756B] mx-auto mb-2.5" aria-hidden="true" />
              <p className="font-serif-display text-xl font-semibold text-[#181615]">
                Your Lookbook is Empty
              </p>
              <p className="text-xs text-[#5E5850] mt-1 max-w-xs mx-auto leading-relaxed">
                Save any Casual, Business, or Night Out flat-lay outfit card to build your personal
                styling reference archive.
              </p>
            </div>
          ) : (
            savedItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[#F2EFE9] border border-[#E4DFD5] flex gap-4 items-start"
              >
                <img
                  src={item.outfit.flatLayImageUrl}
                  alt={item.outfit.editorialTitle}
                  referrerPolicy="no-referrer"
                  className="w-24 h-32 object-cover rounded-lg border border-[#E4DFD5] shrink-0 bg-[#FAF8F5]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#9E472A] font-semibold">
                    {item.outfit.occasion} · {item.garmentName}
                  </p>
                  <h3 className="font-serif-display text-lg font-semibold text-[#181615] truncate">
                    {item.outfit.editorialTitle}
                  </h3>
                  <p className="text-xs text-[#5E5850] mt-0.5 line-clamp-2">
                    {item.outfit.subtitle}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenEditor(item.outfit);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#181615] bg-[#FAF8F5] border border-[#D4CEC3] rounded-md hover:border-[#181615] cursor-pointer"
                    >
                      <Wand2 className="w-3 h-3 text-[#9E472A]" aria-hidden="true" />
                      <span>Edit Look</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label={`Remove ${item.outfit.editorialTitle} from Lookbook`}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5E5850] hover:text-[#9E472A] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 bg-[#F2EFE9] border-t border-[#E4DFD5] flex items-center justify-between">
          <span className="text-xs text-[#5E5850]">
            All saved outfits retain piece breakdowns & edit history
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#FAF8F5] bg-[#181615] rounded-lg cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
