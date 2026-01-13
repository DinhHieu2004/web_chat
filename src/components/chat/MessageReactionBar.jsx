import React, { useState, useRef } from "react";
import { FaRegSmile } from "react-icons/fa";
import { REACTION_EMOJIS, unifiedToEmoji } from "../../utils/emoji";

export default function MessageReactionBar({
  message,
  currentUser,
  onToggleReaction,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const reactions = message?.reactions || {};

  const currentUserKey =
    typeof currentUser === "string"
      ? currentUser.startsWith("user:")
        ? currentUser
        : `user:${currentUser}`
      : null;

  const currentUserReactionUnified = currentUserKey
    ? Object.keys(reactions).find((unified) =>
        reactions[unified]?.includes(currentUserKey)
      )
    : null;

  const displayUnified = currentUserReactionUnified || REACTION_EMOJIS[0];

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center pt-2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`flex items-center px-1 py-1 text-sm
          ${currentUserReactionUnified ? "text-blue-500" : "text-gray-400"}
          hover:text-gray-600
        `}
        onClick={() => {
          setOpen(true);
        }}
      >
        <span className="text-base leading-none">
          {currentUserReactionUnified ? (
            unifiedToEmoji(displayUnified)
          ) : (
            <span className="relative top-[4px] inline-flex">
              <FaRegSmile />
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          className="
            absolute bottom-full left-1/2 -translate-x-1/2
            bg-white border border-gray-200
            shadow-lg rounded-full
            px-2 py-1 flex gap-1 z-50
          "
        >
          {REACTION_EMOJIS.map((unified) => {
            const emoji = unifiedToEmoji(unified);
            const active = currentUserReactionUnified === unified;

            return (
              <button
                key={unified}
                type="button"
                className={`text-xl px-1 transition-transform duration-150
                  hover:scale-125
                  ${active ? "scale-125" : ""}
                `}
                onClick={() => {
                  if (currentUserKey) {
                    onToggleReaction(message, unified);
                  }
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
