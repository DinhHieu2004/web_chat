import React, { useMemo, useState } from "react";
import { STICKERS } from "../../data/stickerList";
import { GIFS } from "../../data/gifList";
import EmojiPickerPanel from "./EmojiPickerPanel";

const TABS = {
  STICKER: "STICKER",
  EMOJI: "EMOJI",
  GIF: "GIF",
};

export default function ChatPickerPanel({
  open,
  panelRef,
  activeTab,
  setActiveTab,
  onPickSticker,
  onPickGif,
  onPickEmoji,
}) {
  const [keyword, setKeyword] = useState("");

  const filteredStickers = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return STICKERS;
    return STICKERS.filter((s) => s.id.toLowerCase().includes(k));
  }, [keyword]);

  const filteredGifs = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return GIFS;
    return GIFS.filter((g) => g.id.toLowerCase().includes(k));
  }, [keyword]);

  if (!open) return null;

  const isEmoji = activeTab === TABS.EMOJI;

  return (
    <div
      ref={panelRef}
      className="w-80 max-w-[85vw] h-[420px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden flex flex-col"
    >
      <div className="px-4 pt-3">
        <div className="flex gap-8 text-sm font-semibold border-b border-gray-200">
          {Object.values(TABS).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setKeyword("");
                  setActiveTab(tab);
                }}
                className={`pb-2 -mb-px transition-colors ${
                  active
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>
      {!isEmoji && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-3 h-9">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activeTab === TABS.EMOJI && (
          <div className="h-full overflow-hidden">
            <EmojiPickerPanel open onPick={(emoji) => onPickEmoji?.(emoji)} />
          </div>
        )}

        {activeTab === TABS.STICKER && (
          <div className="h-full px-4 pb-4 overflow-auto">
            <div className="grid grid-cols-4 gap-2">
              {filteredStickers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="hover:bg-gray-100 rounded-lg p-1"
                  onClick={() => onPickSticker?.(s)}
                  title={s.id}
                >
                  <img
                    src={s.url}
                    alt={s.id}
                    className="w-16 h-16 object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === TABS.GIF && (
          <div className="h-full px-4 pb-4 overflow-auto">
            <div className="grid grid-cols-2 gap-2">
              {filteredGifs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="hover:bg-gray-100 rounded-lg p-1"
                  onClick={() => onPickGif?.(g)}
                  title={g.id}
                >
                  <img
                    src={g.url}
                    alt={g.id}
                    className="w-full h-28 object-contain rounded-lg"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
