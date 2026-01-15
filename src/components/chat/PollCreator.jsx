import { useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function PollCreator({ onClose, onCreate }) {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);

    const addOption = () => {
        setOptions([...options, ""]);
    };

    const updateOption = (index, value) => {
        const next = [...options];
        next[index] = value;
        setOptions(next);
    };

    const removeOption = (index) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleCreate = () => {
        if (!question.trim()) return;

        const validOptions = options.filter(o => o.trim());
        if (validOptions.length < 2) {
            alert("Cần ít nhất 2 lựa chọn");
            return;
        }

        onCreate({
            question,
            options: validOptions,
        });

        onClose();
    };

    return (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-1/2 bg-gray-800 text-white p-4 rounded-md">
            <div className="flex justify-between mb-3">
                <b>Tạo thăm dò</b>
                <button onClick={onClose}>
                    <FaTimes />
                </button>
            </div>

            <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Câu hỏi..."
                className="w-full mb-3 px-2 py-1 bg-gray-700 rounded"
            />

            {options.map((opt, i) => (
                <div key={i} className="flex gap-2 mb-2">
                    <input
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Lựa chọn ${i + 1}`}
                        className="flex-1 px-2 py-1 bg-gray-700 rounded"
                    />

                    {options.length > 2 && (
                        <button onClick={() => removeOption(i)}>
                            <FaTimes size={12} />
                        </button>
                    )}
                </div>
            ))}

            <button onClick={addOption} className="text-sm mb-3">
                + Thêm lựa chọn
            </button>

            <button
                onClick={handleCreate}
                disabled={!question.trim()}
                className="w-full bg-blue-600 py-1 rounded disabled:opacity-50"
            >
                Tạo
            </button>
        </div>
    );
}
