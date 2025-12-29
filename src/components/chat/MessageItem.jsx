import React from "react";
import { FaUserCircle, FaFileAlt, FaReply, FaShare } from "react-icons/fa";

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
    } catch (_) { }
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

const emojiToCps = (text) => {
    if (typeof text !== "string" || !text.trim()) return null;
    try {
        return Array.from(text).map((ch) =>
            ch.codePointAt(0).toString(16).toUpperCase()
        );
    } catch (_) {
        return null;
    }
};

export default function MessageItem({
    msg,
    onReply,
    onForward,
    isRoom,
    onVote,
}) {
    const isMe = msg.sender === "user";
    const finalType = msg.type || "text";
    const finalUrl = msg.url || null;

    const finalText =
        typeof msg.text === "string" ? msg.text : msg.text?.text || "";
    const safeText =
        typeof finalText === "string" ? finalText : String(finalText || "");

    const finalFileName = msg.fileName || null;
    const replyMeta = msg.meta?.reply;

    const normalizeReplyPreview = (reply) => {
        if (!reply?.preview) return null;
        if (typeof reply.preview === "object") return reply.preview;
        return { text: reply.preview };
    };

    const buildPreviewForForward = (m) => {
        if (m?.type === "forward" && m?.meta?.forward?.preview) {
            const pv = m.meta.forward.preview;
            if (
                pv?.type === "richText" &&
                (!Array.isArray(pv?.blocks) || pv.blocks.length === 0) &&
                Array.isArray(m?.blocks)
            ) {
                return { ...pv, blocks: m.blocks };
            }
            return pv;
        }

        const t = typeof m?.text === "string" ? m.text : m?.text?.text ?? "";
        let cps = null;

        if (m?.type === "emoji") {
            cps = Array.isArray(m?.cps) ? m.cps : null;

            if (!cps && typeof t === "string" && t.trim().startsWith("{")) {
                const decoded = decodeEmojiFromCpsJson(t);
                cps = emojiToCps(decoded);
            }

            if (!cps) cps = emojiToCps(t);
        }

        return {
            type: m?.type || "text",
            text: t,
            cps, // ✅ emoji cps
            url: m?.url || null,
            fileName: m?.fileName || null,
            blocks: Array.isArray(m?.blocks) ? m.blocks : [],
            rawMes: typeof m?.rawMes === "string" ? m.rawMes : null,
        };
    };

    const renderRichTextFromBlocks = (blocks) => {
        const arr = Array.isArray(blocks) ? blocks : [];
        if (arr.length === 0) return null;

        return (
            <div className="flex flex-col gap-1">
                {arr.map((block, i) => (
                    <div key={i} style={{ whiteSpace: "pre-wrap" }}>
                        {Array.isArray(block?.spans) && block.spans.length > 0 ? (
                            block.spans.map((span, j) => {
                                const style = {
                                    fontWeight: span.styles?.bold ? "bold" : "normal",
                                    fontStyle: span.styles?.italic ? "italic" : "normal",
                                    textDecoration: [
                                        span.styles?.underline ? "underline" : "",
                                        span.styles?.strike ? "line-through" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" "),
                                    fontFamily: span.font || "inherit",
                                    color: span.color || "inherit",
                                    fontSize: span.fontSize || "inherit",
                                };

                                return (
                                    <span key={j} style={style}>
                                        {span.text}
                                    </span>
                                );
                            })
                        ) : (
                            <span>{block?.text || ""}</span>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderRichText = () => {
        const blocks = Array.isArray(msg?.blocks) ? msg.blocks : [];
        if (blocks.length === 0) return null;
        return renderRichTextFromBlocks(blocks);
    };

    const renderContent = () => {
        if (finalType === "forward") {
            const fwd = msg?.meta?.forward;
            const pv = fwd?.preview || {};
            const note = typeof fwd?.note === "string" ? fwd.note : "";

            const pvType = pv?.type || "text";
            const pvUrl = pv?.url || null;
            const pvText =
                typeof pv?.text === "string" ? pv.text : pv?.text?.text ?? "";
            const pvFileName = pv?.fileName || null;

            let pvTextSafe = pvText;

            if (pvType === "emoji") {
                const decodedFromCps = cpsToEmoji(pv?.cps);
                const decodedFromJson = decodeEmojiFromCpsJson(pvText);
                pvTextSafe = decodedFromCps || decodedFromJson || pvTextSafe;
            }
            const pvBlocks =
                pvType === "richText"
                    ? Array.isArray(pv?.blocks) && pv.blocks.length > 0
                        ? pv.blocks
                        : Array.isArray(msg?.blocks)
                            ? msg.blocks
                            : []
                    : [];

            return (
                <div className="flex flex-col gap-2">
                    {note.trim() && (
                        <p className="text-sm wrap-break-words whitespace-pre-wrap">{note}</p>
                    )}

                    {pvType === "emoji" && (
                        <div className="text-base leading-none">
                            {String(pvTextSafe || "")}
                        </div>
                    )}

                    {pvType === "richText" && pvBlocks.length > 0 && (
                        <div>{renderRichTextFromBlocks(pvBlocks)}</div>
                    )}

                    {pvType === "sticker" && pvUrl && (
                        <img
                            src={pvUrl}
                            alt="sticker"
                            className="w-28 h-28 object-contain"
                        />
                    )}

                    {pvType === "gif" && pvUrl && (
                        <img
                            src={pvUrl}
                            alt="gif"
                            className="w-44 h-32 object-cover rounded-lg"
                        />
                    )}

                    {pvType === "image" && pvUrl && (
                        <img
                            src={pvUrl}
                            alt="image"
                            className="max-w-xs rounded-lg cursor-pointer"
                            onClick={() => window.open(pvUrl, "_blank")}
                        />
                    )}

                    {pvType === "audio" && pvUrl && (
                        <audio controls className="max-w-xs">
                            <source src={pvUrl} />
                        </audio>
                    )}

                    {pvType === "video" && pvUrl && (
                        <video controls className="max-w-xs rounded-lg">
                            <source src={pvUrl} />
                        </video>
                    )}

                    {pvType === "file" && pvUrl && (
                        <a
                            href={pvUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-sm underline"
                        >
                            <FaFileAlt />
                            {pvFileName || "Tải file"}
                        </a>
                    )}

                    {pvType !== "emoji" &&
                        pvType !== "richText" &&
                        typeof pvText === "string" &&
                        pvText.trim() && (
                            <p className="text-sm wrap-break-words whitespace-pre-wrap">{pvText}</p>
                        )}
                </div>
            );
        }

        if (finalType === "poll") {
            let poll = msg.poll;

            if (typeof poll === "string") {
                try {
                    const parsed = JSON.parse(poll);
                    poll = parsed?.payload || parsed || poll;
                } catch (e) { }
            }

            if (!poll || !poll.options) {
                return (
                    <div className="text-sm text-red-500">Không thể hiển thị poll</div>
                );
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
                                <div className="text-sm text-gray-600 w-10 text-center">
                                    {opt.votes}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        let displayEmojiText = finalText;
        if (finalType === "emoji") {
            const decoded = decodeEmojiFromCpsJson(finalText);
            if (decoded) displayEmojiText = decoded;
        }

        return (
            <div className="flex flex-col gap-2">
                {finalType === "emoji" && (
                    <div className="text-base leading-none">{displayEmojiText}</div>
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

                {finalType === "richText" &&
                    Array.isArray(msg?.blocks) &&
                    msg.blocks.length > 0 && <div>{renderRichText()}</div>}

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
                        <source src={finalUrl} />
                    </audio>
                )}

                {finalType === "video" && finalUrl && (
                    <video controls className="max-w-xs rounded-lg" crossOrigin="anonymous">
                        <source
                            src={finalUrl}
                            type={finalFileName?.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4'}
                        />
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

                {finalType !== "emoji" &&
                    finalType !== "richText" &&
                    finalType !== "poll" &&
                    safeText && safeText.trim() !== "" && (
                        <p className={`text-sm wrap-break-words whitespace-pre-wrap ${finalUrl ? "mt-2" : ""}`}>
                            {safeText}
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
                    {replyMeta &&
                        (() => {
                            const preview = normalizeReplyPreview(replyMeta);
                            let replyPreviewText = preview?.text || "";
                            if (preview?.type === "emoji") {
                                const fromCps = cpsToEmoji(preview?.cps);
                                const fromJson = decodeEmojiFromCpsJson(replyPreviewText);
                                replyPreviewText = fromCps || fromJson || replyPreviewText;
                            }

                            return (
                                <div
                                    className={`mb-2 px-2 py-1 rounded border-l-4 text-xs ${isMe
                                        ? "bg-white/20 border-white/50"
                                        : "bg-gray-200 border-purple-500"
                                        }`}
                                >
                                    <div className="font-semibold truncate">
                                        Trả lời {replyMeta.from === msg.from ? "Bạn" : replyMeta.from}
                                    </div>

                                    {preview?.url && (
                                        <>
                                            {["image", "gif", "sticker"].includes(preview.type) && (
                                                <img
                                                    src={preview.url}
                                                    className="mt-1 max-w-20 max-h-20 object-contain rounded"
                                                    alt=""
                                                />
                                            )}

                                            {preview.type === "video" && (
                                                <video
                                                    src={preview.url}
                                                    className="mt-1 max-w-24 max-h-16 rounded"
                                                    muted
                                                />
                                            )}

                                            {preview?.type === "file" && (
                                                <div className="mt-1 flex items-center gap-1 truncate">
                                                    <FaFileAlt className="shrink-0" />
                                                    <span className="truncate">
                                                        {preview.fileName || "Tệp đính kèm"}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {!preview?.url && replyPreviewText && (
                                        <div className="opacity-80 truncate">{replyPreviewText}</div>
                                    )}
                                </div>
                            );
                        })()}

                    {renderContent()}
                </div>

                <button
                    onClick={() => onReply?.(msg)}
                    className={`absolute -bottom-1 ${isMe ? "-left-8" : "-right-8"
                        } opacity-0 group-hover:opacity-100 text-gray-400 hover:text-purple-500 transition p-2`}
                    title="Trả lời"
                    type="button"
                >
                    <FaReply size={14} />
                </button>

                <button
                    onClick={() =>
                        onForward?.({
                            message: msg,
                            preview: buildPreviewForForward(msg),
                        })
                    }
                    className={`absolute -bottom-1 ${isMe ? "-left-16" : "-right-16"
                        } opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition p-2`}
                    title="Chuyển tiếp"
                    type="button"
                >
                    <FaShare size={14} />
                </button>
            </div>
        </div>
    );
}
