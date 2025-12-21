import React, { useEffect, useMemo, useRef } from "react";
import { FiX, FiSearch } from "react-icons/fi";

const norm = (s = "") => String(s).toLowerCase();

function highlightSnippet(text = "", q = "") {
  const query = q.trim();
  if (!query) return text;
  const lower = text.toLowerCase();
  const lowerQ = query.toLowerCase();
  const idx = lower.indexOf(lowerQ);
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const mid = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);

  return (
    <>
      {before}
      <mark className="bg-yellow-200 px-1 rounded">{mid}</mark>
      {after}
    </>
  );
}

export default function ChatSearchPanel({
  open,
  onClose,
  query,
  setQuery,
  results, 
  onPickMessage, 
  activeChatName,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const hasQuery = query.trim().length > 0;

  const items = useMemo(() => {
    return (results || []).slice(0, 50);
  }, [results]);

  if (!open) return null;

  return (
    <div className="w-[360px] max-w-[90vw] h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="font-semibold text-gray-800">Tìm kiếm trong trò chuyện</div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100"
          title="Đóng"
        >
          <FiX size={18} />
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 border border-blue-400 rounded-lg px-3 h-10">
          <FiSearch className="text-gray-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ khóa để tìm kiếm"
            className="flex-1 outline-none text-sm"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-sm text-gray-500 hover:text-gray-700"
              title="Xóa"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-2 pb-3">
        {!hasQuery ? (
          <div className="px-3 py-10 text-center text-gray-500">
            <div className="text-sm">
              Hãy nhập từ khóa để bắt đầu tìm kiếm tin nhắn trong trò chuyện{" "}
              <span className="font-medium">{activeChatName || ""}</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-10 text-center text-gray-500">
            Không tìm thấy kết quả.
          </div>
        ) : (
          <div className="px-2">
            <div className="text-xs font-semibold text-gray-600 px-2 py-2">
              Tin nhắn ({results.length})
            </div>

            <div className="flex flex-col">
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPickMessage?.(m.id)}
                  className="text-left px-3 py-3 hover:bg-gray-50 rounded-lg border-b border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-800">
                      {m.from || "Unknown"}
                    </div>
                    <div className="text-xs text-gray-500">{m.time || ""}</div>
                  </div>

                  <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                    {highlightSnippet(m.text || "", query)}
                  </div>
                </button>
              ))}

              {results.length > 50 && (
                <div className="p-3 text-center text-gray-500 text-sm">
                  (Đang hiển thị 50 kết quả đầu)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
