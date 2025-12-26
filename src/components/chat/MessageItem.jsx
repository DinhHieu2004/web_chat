import React from "react";
import { FaUserCircle, FaFileAlt } from "react-icons/fa";

export default function MessageItem({ msg, isRoom, onVote }) {
    const isMe = msg.sender === "user";

    const finalType = msg.type || "text";
    const finalUrl = msg.url || null;
    const finalText = msg.text || "";
    const finalFileName = msg.fileName || null;

    const renderContent = () => {
        // Poll rendering
        if (finalType === "poll") {
            let poll = msg.poll;
            if (typeof poll === "string") {
                try {
                    const parsed = JSON.parse(poll);
                    poll = parsed?.payload || parsed || poll;
                } catch (e) {
                    // leave as string
                }
            }

            if (!poll || !poll.options) {
                return <div className="text-sm text-red-500">Không thể hiển thị poll</div>;
            }

            return (
                <div className="flex flex-col gap-3">
                    <div className="font-semibold">{poll.question}</div>
                    <div className="flex flex-col gap-2">
                        {poll.options.map((opt) => (
                            <div key={opt.id} className="flex items-center gap-3">
                                <button
                                    onClick={() => onVote?.(poll.pollId, opt.id)}
                                    className="flex-1 text-left px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                    type="button"
                                >
                                    {opt.text}
                                </button>
                                <div className="text-sm text-gray-600 w-10 text-center">{opt.votes}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2">
                {finalType === "emoji" && (
                    <div className="text-base leading-none">{finalText}</div>
                )}

                {finalType === "sticker" && finalUrl && (
                    <img
                        src={finalUrl}
                        alt="sticker"
                        className="w-28 h-28 object-contain"
                        onClick={() => window.open(finalUrl, "_blank")}
                    />
                )}

                {finalType === "gif" && finalUrl && (
                    <img
                        src={finalUrl}
                        alt="gif"
                        className="w-44 h-32 object-cover rounded-lg"
                        onClick={() => window.open(finalUrl, "_blank")}
                    />
                )}

                {finalType === "image" && finalUrl && (
                    <img
                        src={finalUrl}
                        alt={finalText}
                        className="max-w-xs rounded-lg cursor-pointer"
                        onClick={() => window.open(finalUrl, "_blank")}
                    />
                )}

                {finalType === "audio" && finalUrl && (
                    <audio controls className="max-w-xs">
                        <source src={finalUrl} type="audio/webm" />
                    </audio>
                )}

                {finalType === "video" && finalUrl && (
                    <video controls className="max-w-xs rounded-lg">
                        <source src={finalUrl} />
                    </video>
                )}

                {finalType === "file" && finalUrl && (
                    <a
                        href={finalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm underline"
                    >
                        <FaFileAlt />
                        {finalFileName || "Tải file"}
                    </a>
                )}

                {finalType !== "emoji" && finalText.trim() && (
                    <p className="text-sm wrap-break-words whitespace-pre-wrap">
                        {finalText}
                    </p>
                )}
            </div>
        );
    };


    return (
        <div className={`flex mb-4 ${isMe ? "justify-end" : "justify-start"}`}>
            {!isMe && (
                <div className="mr-3 mt-1">
                    <FaUserCircle size={36} className="text-gray-400" />
                </div>
            )}

            <div className="max-w-[70%]">
                <div
                    className={`text-xs text-gray-500 mb-1 ${isMe ? "text-right" : "text-left"
                        }`}
                >
                    {isMe ? "Bạn" : msg.from} - {msg.time}
                </div>

                <div
                    className={`px-4 py-2 rounded-lg ${isMe
                            ? "bg-linear-to-r from-purple-500 to-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                >
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
