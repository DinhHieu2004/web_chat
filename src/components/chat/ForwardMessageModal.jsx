import React, { useMemo, useState } from "react";

export default function ForwardMessageModal({
  open,
  onClose,
  onSend,
  contacts = [],
  messagePreview,
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState({}); 
  const [note, setNote] = useState("");

  const items = useMemo(() => {
    const keyword = (q || "").toLowerCase().trim();
    const base = Array.isArray(contacts) ? contacts : [];
    if (!keyword) return base;
    return base.filter((c) => String(c?.name || "").toLowerCase().includes(keyword));
  }, [contacts, q]);

  const selectedList = useMemo(
    () => items.filter((c) => selected[c.type + ":" + c.name]),
    [items, selected]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-[520px] max-w-[92vw] rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold text-gray-800">Chuyển tiếp tin nhắn</div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="border rounded-lg p-3 bg-gray-50 text-sm">
            <div className="text-gray-500 mb-1">Nội dung</div>
            <div className="text-gray-800 line-clamp-3">
              {messagePreview || "(Không có nội dung)"}
            </div>
          </div>

          <div className="flex items-center gap-2 border rounded-lg px-3 h-10">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm người/nhóm..."
              className="flex-1 outline-none text-sm"
            />
            {q?.trim() && (
              <button type="button" onClick={() => setQ("")} className="text-sm text-gray-500">
                Xóa
              </button>
            )}
          </div>

          <div className="border rounded-lg max-h-[280px] overflow-auto">
            {items.map((c) => {
              const key = c.type + ":" + c.name;
              const checked = !!selected[key];
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      {c.type === "room" ? "Nhóm" : "Cá nhân"}
                    </div>
                  </div>
                </label>
              );
            })}
            {!items.length && (
              <div className="p-3 text-sm text-gray-500">Không tìm thấy kết quả.</div>
            )}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thêm lời nhắn (tuỳ chọn)..."
            className="w-full border rounded-lg p-3 text-sm outline-none min-h-[72px]"
          />
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={Object.values(selected).every((v) => !v)}
            onClick={() => onSend?.({ selectedMap: selected, note })}
            className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
