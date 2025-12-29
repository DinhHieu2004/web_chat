import React, { useEffect, useMemo, useRef } from "react";
import { FiX, FiSearch } from "react-icons/fi";

function highlightSnippet(text = "", q = "") {
    const query = (q || "").trim();
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
    senderFilter,
    setSenderFilter,
    dateFilter,
    setDateFilter,
    senderOptions,
}) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 0);
    }, [open]);

    const hasQuery = (query || "").trim().length > 0;

    const items = useMemo(() => {
        return (results || []).slice(0, 50);
    }, [results]);

    if (!open) return null;

    return (
        <div className="fixed right-0 top-0 bottom-0 w-[360px] max-w-[90vw] bg-white border-l border-gray-200 flex flex-col z-[10010] shadow-2xl">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
                <div className="font-semibold text-gray-800">
                    Tìm kiếm trong trò chuyện
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100"
                    title="Đóng"
                >
                    <FiX size={18} />
                </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
                {/* Search box */}
                <div className="flex items-center gap-2 border border-blue-400 rounded-lg px-3 h-10">
                    <FiSearch className="text-gray-500" />
                    <input
                        ref={inputRef}
                        value={query || ""}
                        onChange={(e) => setQuery?.(e.target.value)}
                        placeholder="Nhập từ khóa để tìm kiếm"
                        className="flex-1 outline-none text-sm bg-transparent"
                    />

                    {hasQuery && (
                        <button
                            type="button"
                            onClick={() => setQuery?.("")}
                            className="text-sm text-gray-500 hover:text-gray-700"
                            title="Xóa"
                        >
                            Xóa
                        </button>
                    )}
                </div>

                {/* Filters row (UNDER search box) */}
                <div className="mt-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="shrink-0">Lọc theo:</span>

                        <select
                            value={senderFilter || "ALL"}
                            onChange={(e) => setSenderFilter?.(e.target.value)}
                            className="flex-1 h-9 border border-gray-200 rounded-lg px-2 bg-white outline-none"
                        >
                            {(senderOptions || ["ALL"]).map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt === "ALL" ? "Tất cả" : opt === "ME" ? "Bạn" : opt}
                                </option>
                            ))}
                        </select>

                        <select
                            value={dateFilter || "ALL"}
                            onChange={(e) => setDateFilter?.(e.target.value)}
                            className="w-[120px] h-9 border border-gray-200 rounded-lg px-2 bg-white outline-none"
                        >
                            <option value="ALL">Tất cả</option>
                            <option value="TODAY">Hôm nay</option>
                            <option value="7D">7 ngày</option>
                            <option value="30D">30 ngày</option>
                        </select>
                    </div>
                </div>
            </div>

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
                            Tin nhắn ({results?.length || 0})
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
                                        {highlightSnippet(m.text || "", query || "")}
                                    </div>
                                </button>
                            ))}

                            {(results?.length || 0) > 50 && (
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
