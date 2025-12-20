import { FaTimes } from "react-icons/fa"
import { useState } from "react";

export default function PollCreator({ onClose, onCreate }) {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);

    const addOption = () => setOptions([...options, ""]);

    const updateOption = (i, value) => {
        const next = [...options];
        next[i] = value;
        setOptions(next);
    };

    const handleCreate = () => {
        if (!question.trim()) return;
        onCreate({ question, options: options.filter(Boolean) })
    };

    return (
        <div className="absolute bottom-20, left,-4, right-4, bg-gray-88 text-white rounded-xl z-50">
            <div className="flex justify-between items-center mb-3">
                <span className="font-semibold">Đặt câu Hỏi</span>
                <button onClick={onClose}>
                    <FaTimes />
                </button>
            </div>

            <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}

                placeholder="Đặt câu hỏi"
                className="w-full bg-transparent border-b border-gray-600 outline-none mb-3"
            />
            {options.map((opt, i) => (
                <input
                    key={i}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder="Thêm lựa chọn..."
                    className="w-full bg-transparent border-b border-gray-700 outline-none mb-2"
                />
            ))}
            <button
                onClick={addOption}
                className="text-sm text-blue-400 mt-2"
            >
                + Thêm lựa chọn
            </button>

            <button
                onClick={handleCreate}
                className="w-full mt-4 bg-gray-600 py-2 rounded-lg disabled:opacity-50"
                disabled={!question.trim()}
            >
                Tạo cuộc thăm dò ý kiến
            </button>
        </div>
    );
}