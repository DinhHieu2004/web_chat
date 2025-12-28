import React, { useMemo, useState, useEffect } from "react";

function getDisplayName(c) {
  return String(c?.displayName || c?.fullName || c?.name || "");
}

function normalizeType(t) {
  if (t === "people" || t === 0) return "people";
  if (t === "room" || t === 1) return "room";
  return String(t || "people");
}

function getInitials(name = "") {
  const s = String(name).trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

const decodeEmojiFromCpsJson = (raw) => {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s.startsWith("{")) return "";
  try {
    const obj = JSON.parse(s);
    if (obj?.customType === "emoji" && Array.isArray(obj?.cps)) {
      return obj.cps
        .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
        .join("");
    }
  } catch (_) {}
  return "";
};

const cpsToEmoji = (cps) => {
  if (!Array.isArray(cps)) return "";
  try {
    return cps.map((hex) => String.fromCodePoint(parseInt(hex, 16))).join("");
  } catch (_) {
    return "";
  }
};

const richBlocksToPlain = (blocks) => {
  const arr = Array.isArray(blocks) ? blocks : [];
  return arr
    .map((b) => {
      if (Array.isArray(b?.spans) && b.spans.length > 0) {
        return b.spans.map((s) => s?.text || "").join("");
      }
      return b?.text || "";
    })
    .join("\n")
    .trim();
};

function PreviewBlock({ preview }) {
  if (!preview) return null;

  if (typeof preview === "string") {
    return <div className="text-sm text-gray-700 truncate">{preview}</div>;
  }

  const url = preview?.url || null;
  const type = preview?.type || "text";
  const textRaw = preview?.text;
  const text =
    typeof textRaw === "string"
      ? textRaw
      : typeof textRaw?.text === "string"
      ? textRaw.text
      : "";
  const fileName = preview?.fileName || "";

  if (type === "emoji") {
    const emojiFromCps = cpsToEmoji(preview?.cps);
    const emojiFromJson = decodeEmojiFromCpsJson(text);
    const display = emojiFromCps || emojiFromJson || text || "[Emoji]";

    return <div className="text-base leading-none">{display}</div>;
  }

  if (type === "richText") {
    const blocks = Array.isArray(preview?.blocks) ? preview.blocks : [];
    const plain = blocks.length ? richBlocksToPlain(blocks) : "";
    const display = plain || text || "[Văn bản]";

    return (
      <div className="text-sm text-gray-700 max-w-[320px]">
        <div className="truncate">{display}</div>
      </div>
    );
  }

  if ((type === "sticker" || type === "gif" || type === "image") && url) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={url}
          alt={type}
          className="w-10 h-10 object-cover rounded-md"
        />
        <div className="text-sm text-gray-700 truncate max-w-[240px]">
          {type === "image" ? "Hình ảnh" : type === "gif" ? "GIF" : "Sticker"}
        </div>
      </div>
    );
  }

  if (type === "audio" && url) {
    return (
      <audio controls className="w-full max-w-[320px]">
        <source src={url} />
      </audio>
    );
  }

  if (type === "video" && url) {
    return (
      <video controls className="w-full max-w-[320px] rounded-md">
        <source src={url} />
      </video>
    );
  }

  if (type === "file" && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-blue-600 underline truncate max-w-[320px] block"
      >
        {fileName || "Tệp đính kèm"}
      </a>
    );
  }

  return (
    <div className="text-sm text-gray-700 truncate max-w-[320px]">
      {text || "(Tin nhắn)"}
    </div>
  );
}

export default function ForwardMessageModal({
  open,
  onClose,
  onSend,
  contacts = [],
  messagePreview,
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("recent");
  const [selected, setSelected] = useState({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;

    setSelected({});
    setNote("");
    setQ("");
    setTab("recent");
  }, [open]);

  const MAX = 100;

  const selectedKeys = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );
  const selectedCount = selectedKeys.length;

  const allContactsNormalized = useMemo(() => {
    const base = Array.isArray(contacts) ? contacts : [];
    return base.map((c) => {
      const name = getDisplayName(c);
      const type = normalizeType(c?.type);
      return { ...c, __name: name, __type: type, __key: `${type}:${name}` };
    });
  }, [contacts]);

  const items = useMemo(() => {
    const keyword = q.toLowerCase().trim();

    return allContactsNormalized
      .filter((c) =>
        tab === "recent"
          ? true
          : tab === "room"
          ? c.__type === "room"
          : c.__type === "people"
      )
      .filter((c) => c.__name.toLowerCase().includes(keyword));
  }, [allContactsNormalized, q, tab]);

  const selectedList = useMemo(() => {
    const set = new Set(selectedKeys);
    return allContactsNormalized.filter((c) => set.has(c.__key));
  }, [allContactsNormalized, selectedKeys]);

  const toggleOne = (c) => {
    setSelected((prev) => {
      const next = { ...prev };
      next[c.__key] = !next[c.__key];
      if (!next[c.__key]) delete next[c.__key];
      return next;
    });
  };

  const clearAll = () => setSelected({});

  const handleSend = () => {
    if (!selectedCount) return;
    onSend?.({ selectedMap: selected, note });
    setSelected({});
    setNote("");
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-[30vw] max-w-[520px] min-w-[360px] h-[90vh] rounded-lg shadow-md overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-gray-200/60 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">Chia sẻ</div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded hover:bg-gray-100 text-sm"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pt-3 pb-3 bg-white">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full h-8 border border-gray-200/60 rounded-md px-3 pr-8 text-sm outline-none"
            />

            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                aria-label="clear-search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pt-2 flex gap-4 text-sm">
          {[
            { id: "recent", label: "Gần đây" },
            { id: "room", label: "Nhóm" },
            { id: "people", label: "Bạn bè" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                  : "text-gray-600 pb-1"
              }
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="border-t border-gray-200/60 mt-1" />

        <div className="relative flex-1 overflow-hidden">
          <div
            className={[
              "h-full overflow-auto transition-[width] duration-200 ease-out",
              selectedCount ? "w-[60%]" : "w-full",
            ].join(" ")}
          >
            {items.length > 0 ? (
              items.map((c) => (
                <button
                  key={c.__key}
                  onClick={() => toggleOne(c)}
                  className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-gray-50"
                  type="button"
                >
                  <input
                    type="checkbox"
                    checked={!!selected[c.__key]}
                    readOnly
                  />

                  <div className="w-8 h-8 rounded-md bg-blue-600 text-white text-xs grid place-items-center">
                    {getInitials(c.__name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">
                      {c.__name}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 text-gray-500">
                <div className="text-sm font-medium mb-1">
                  Không tìm thấy kết quả
                </div>
                <div className="text-xs">Vui lòng thử lại từ khóa khác</div>
              </div>
            )}
          </div>

          <div
            className={[
              "absolute inset-y-0 right-0 w-[40%] bg-white border-l border-gray-200/60",
              "transition-transform duration-400 ease-out",
              selectedCount ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
          >
            <div className="h-full flex flex-col">
              <div className="px-3 py-2 border-b border-gray-200/60 text-sm flex justify-between">
                <span>
                  Đã chọn {selectedCount}/{MAX}
                </span>
                <button
                  onClick={clearAll}
                  className="text-blue-600 text-sm"
                  type="button"
                >
                  Xóa
                </button>
              </div>

              <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
                {selectedList.map((c) => (
                  <div
                    key={c.__key}
                    className="flex items-center justify-between gap-2 bg-gray-100 rounded-md px-2 py-1 text-sm"
                  >
                    <span className="truncate max-w-[120px] text-gray-800">
                      {c.__name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setSelected((prev) => {
                          const next = { ...prev };
                          delete next[c.__key];
                          return next;
                        })
                      }
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      aria-label="remove-selected"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-gray-200/60 bg-gray-50">
          <div className="bg-white border border-gray-200/60 rounded-md p-2 opacity-60">
            <PreviewBlock preview={messagePreview} />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="mt-2 w-full h-8 border border-gray-200/60 rounded-md px-3 text-sm outline-none"
          />
        </div>

        <div className="px-4 py-2 border-t border-gray-200/60 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 h-8 rounded-md border border-gray-200/60 text-sm"
            type="button"
          >
            Hủy
          </button>
          <button
            disabled={!selectedCount}
            onClick={handleSend}
            className="px-3 h-8 rounded-md bg-blue-600 text-white text-sm disabled:bg-blue-300"
            type="button"
          >
            Chia sẻ
          </button>
        </div>
      </div>
    </div>
  );
}
