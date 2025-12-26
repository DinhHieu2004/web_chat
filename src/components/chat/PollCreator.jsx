import { FaTimes } from "react-icons/fa";
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

    const removeOption = (i) => {
        if (options.length <= 2) return; 
        setOptions(options.filter((_, idx) => idx !== i));
    };

    const handleCreate = () => {
        if (!question.trim()) return;
        const validOptions = options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
            alert("Cần ít nhất 2 lựa chọn!");
            return;
        }
        onCreate({ question, options: validOptions });
        onClose();
    };

    return (
        <div className="absolute bottom-20 left-4 right-4 bg-gray-800 text-white rounded-xl shadow-2xl p-4 z-50 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-lg">Tạo cuộc thăm dò ý kiến</span>
                <button 
                    onClick={onClose}
                    className="hover:bg-gray-700 p-1 rounded transition-colors"
                >
                    <FaTimes />
                </button>
            </div>

            <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Đặt câu hỏi..."
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="space-y-2 mb-3">
                {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input
                            value={opt}
                            onChange={(e) => updateOption(i, e.target.value)}
                            placeholder={`Lựa chọn ${i + 1}...`}
                            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {options.length > 2 && (
                            <button
                                onClick={() => removeOption(i)}
                                className="text-red-400 hover:text-red-300 p-2"
                                title="Xóa lựa chọn"
                            >
                                <FaTimes size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={addOption}
                className="text-sm text-blue-400 hover:text-blue-300 mb-4"
            >
                + Thêm lựa chọn
            </button>

            <button
                onClick={handleCreate}
                className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!question.trim()}
            >
                Tạo cuộc thăm dò ý kiến
            </button>
        </div>
    );
}