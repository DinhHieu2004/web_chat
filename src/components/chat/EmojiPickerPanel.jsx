import React from "react";
import EmojiPicker from "emoji-picker-react";

export default function EmojiPickerPanel({ open, onPick, panelRef }) {
  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="w-80 max-w-[85vw] rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
    >
      <div className="h-80 overflow-hidden">
        <div className="origin-top-left scale-[0.85]">
          <EmojiPicker
            onEmojiClick={(emojiData) => onPick?.(emojiData.emoji)}
            lazyLoadEmojis
          />
        </div>
      </div>
    </div>
  );
}
