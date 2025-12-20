import React from "react";
import {FaUserCircle, FaFileAlt, FaReply} from "react-icons/fa";

// <<<<<<< HEAD
// const tryParseCustomPayload = (text) => {
//     if (!text || typeof text !== "string") return null;

//     if (!text.startsWith("{")) return null;

//     try {
//         const parsed = JSON.parse(text);

//         if (parsed && parsed.customType) {
//             return {
//                 type: parsed.customType,
//                 url: parsed.url || null,
//                 text: parsed.text || "",
//                 fileName: parsed.fileName || null,
//                 meta: parsed.meta || null,
//             };
//         }

//         if (parsed?.customType === "emoji" && Array.isArray(parsed?.cps)) {
//             const emojiText = parsed.cps
//                 .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
//                 .join("");

//             return {
//                 type: "emoji",
//                 url: null,
//                 text: emojiText,
//                 fileName: null,
//                 meta: parsed.meta || null,
//             };
//         }
//     } catch (e) {
//         return null;
//     }

//     return null;
// };

// export default function MessageItem({msg, onReply}) {
//     const isMe = msg.sender === "user";

//     const parsedFromText = tryParseCustomPayload(msg.text);
//     const finalType = parsedFromText?.type || msg.type || "text";
//     const finalUrl = parsedFromText?.url || msg.url || null;
//     const finalText = parsedFromText?.text ?? msg.text ?? "";
//     const finalFileName = parsedFromText?.fileName || msg.fileName || null;

//     const replyMeta = msg.meta?.reply;
// =======
export default function MessageItem({ msg }) {
  const isMe = msg.sender === "user";

  const finalType = msg.type || "text";
  const finalUrl = msg.url || null;
  const finalText = msg.text || "";
  const finalFileName = msg.fileName || null;

    const renderContent = () => (
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
                    <source src={finalUrl}/>
                </video>
            )}

            {finalType === "file" && finalUrl && (
                <a
                    href={finalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm underline"
                >
                    <FaFileAlt/>
                    {finalFileName || "Tải file"}
                </a>
            )}
            {finalType !== "emoji" && finalText && finalText.trim() && (
                <p className="text-sm wrap-break-words whitespace-pre-wrap">
                    {finalText}
                </p>
            )}

        </div>
    );

    return (
        <div className={`flex mb-4 ${isMe ? "justify-end" : "justify-start"}`}>
            {!isMe && (
                <div className="mr-3 mt-1">
                    <FaUserCircle size={36} className="text-gray-400"/>
                </div>
            )}

            <div className="max-w-[70%] relative group">

                <div
                    className={`text-xs text-gray-500 mb-1 ${
                        isMe ? "text-right" : "text-left"
                    }`}
                >
                    {isMe ? "Bạn" : msg.from} - {msg.time}
                </div>

                <div
                    className={`px-4 py-2 rounded-lg ${
                        isMe
                            ? "bg-linear-to-r from-purple-500 to-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                    }`}
                >
                    {replyMeta && (
                        <div
                            className={`mb-2 px-2 py-1 rounded border-l-4 text-xs ${
                                isMe
                                    ? "bg-white/20 border-white/50"
                                    : "bg-gray-200 border-purple-500"
                            }`}
                        >
                            <div className="font-semibold truncate">
                                Trả lời {replyMeta.sender === "user" ? "Bạn" : replyMeta.from}
                            </div>

                            <div className="opacity-80 truncate">
                                {replyMeta.preview}
                            </div>
                        </div>
                    )}
                    {renderContent()}
                </div>
                <button
                    onClick={() => {
                        onReply?.(msg);
                        console.log(msg)
                    }}
                    className={`absolute -bottom-1 ${isMe ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100
                                text-gray-400 hover:text-purple-500 transition p-2`}
                    title="Trả lời">
                    <FaReply size={14}/>
                </button>
            </div>
        </div>
    );
}
