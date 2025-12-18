import React from "react";
import EmojiPicker from "emoji-picker-react";

export default function EmojiPickerPanel({ open, onPick }) {
  if (!open) return null;

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="origin-top-left scale-[0.9] w-[111%] h-[111%]">
        <EmojiPicker
          onEmojiClick={(emojiData) => onPick?.(emojiData.emoji)}
          lazyLoadEmojis
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
