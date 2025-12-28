import React from "react";
import { FaUserCircle, FaFileAlt, FaReply } from "react-icons/fa";

export default function MessageItem({ msg, onReply, isRoom, onVote }) {
    const isMe = msg.sender === "user";
    const finalType = msg.type || "text";
    console.log(finalType)
    console.log(msg)
    const finalUrl = msg.url || null;
    const finalText = msg.text || "";
    const finalFileName = msg.fileName || null;
    const replyMeta = msg.meta?.reply;
    const normalizeReplyPreview = (reply) => {
        if (!reply?.preview) return null;

        if (typeof reply.preview === "object") {
            return reply.preview;
        }
        return {
            text: reply.preview,
        };
    };

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
                {finalType === "richText" && msg.blocks.length > 0 && (
                    <div className="flex flex-col gap-1">
                        {msg.blocks.map((block, i) => (
                            <div key={i} style={{ whiteSpace: "pre-wrap" }}>
                                {block.spans?.length ? (
                                    block.spans.map((span, j) => {
                                        const style = {
                                            fontWeight: span.styles?.bold ? "bold" : "normal",
                                            fontStyle: span.styles?.italic ? "italic" : "normal",
                                            textDecoration: [
                                                span.styles?.underline ? "underline" : "",
                                                span.styles?.strike ? "line-through" : ""
                                            ].filter(Boolean).join(" "),
                                            fontFamily: span.font || "inherit",
                                            color: span.color || "inherit",
                                            fontSize: span.fontSize || "inherit",
                                        };
                                        return (
                                            <span key={j} style={style}>{span.text}</span>
                                        );
                                    })
                                ) : (
                                    <span>{block.text}</span>
                                )}
                            </div>
                        ))}
                    </div>
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
                {finalType !== "emoji" &&  finalType !== "richText" && finalText.trim() && (
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

            <div className="max-w-[70%] relative group">

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
                    {replyMeta && (() => {
                        const preview = normalizeReplyPreview(replyMeta);

                        return (
                            <div
                                className={`mb-2 px-2 py-1 rounded border-l-4 text-xs ${isMe
                                        ? "bg-white/20 border-white/50"
                                        : "bg-gray-200 border-purple-500"
                                    }`}
                            >
                                <div className="font-semibold truncate">
                                    {replyMeta.from}
                                </div>
                                {preview?.url && (
                                    <>
                                        {["image", "gif", "sticker"].includes(preview.type) && (
                                            <img src={preview.url} className="mt-1 max-w-20 max-h-20 object-contain rounded" />
                                        )}

                                        {preview.type === "video" && (
                                            <video src={preview.url} className="mt-1 max-w-24 max-h-16 rounded" muted />
                                        )}
                                        {preview?.type === "file" && (
                                            <div className="mt-1 flex items-center gap-1 truncate">
                                                <FaFileAlt className="shrink-0" />
                                                <span className="truncate">{preview.fileName || "Tệp đính kèm"}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {!preview?.url && preview?.text && (
                                    <div className="opacity-80 truncate">
                                        {preview.text}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    {renderContent()}
                </div>
                <button
                    onClick={() => {
                        onReply?.(msg);
                    }}
                    className={`absolute -bottom-1 ${isMe ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100
                                text-gray-400 hover:text-purple-500 transition p-2`}
                    title="Trả lời">
                    <FaReply size={14} />
                </button>
            </div>
        </div>
    );
}
