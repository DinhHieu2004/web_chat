import React from "react";
import { FaUserCircle, FaFileAlt } from "react-icons/fa";

/**
 * ================================
 * PARSE JSON PAYLOAD (FILE + CAPTION)
 * ================================
 */
const tryParseCustomPayload = (text) => {
  if (!text || typeof text !== "string") return null;

  // tránh parse text thường
  if (!text.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(text);

    if (parsed && parsed.customType && parsed.url) {
      return {
        type: parsed.customType, // image | video | audio | file
        url: parsed.url,
        text: parsed.text || "",
        fileName: parsed.fileName || null,
      };
    }
  } catch (e) {
    return null;
  }

  return null;
};

export default function MessageItem({ msg }) {
  const isMe = msg.sender === "user";

  /**
   * ================================
   * CHUẨN HÓA DATA ĐỂ RENDER
   * ================================
   */

  // nếu history trả về mes = JSON string
  const parsedFromText =
    msg.type === "text" ? tryParseCustomPayload(msg.text) : null;

  const finalType = parsedFromText?.type || msg.type || "text";
  const finalUrl = parsedFromText?.url || msg.url || null;
  const finalText = parsedFromText?.text ?? msg.text ?? "";
  const finalFileName = parsedFromText?.fileName || msg.fileName || null;

  
  const renderContent = () => (
    <div className="flex flex-col gap-2">
      {/* IMAGE */}
      {finalType === "image" && finalUrl && (
        <img
          src={finalUrl}
          alt={finalText}
          className="max-w-xs rounded-lg cursor-pointer"
          onClick={() => window.open(finalUrl, "_blank")}
        />
      )}

      {/* AUDIO */}
      {finalType === "audio" && finalUrl && (
        <audio controls className="max-w-xs">
          <source src={finalUrl} />
        </audio>
      )}

      {/* VIDEO */}
      {finalType === "video" && finalUrl && (
        <video controls className="max-w-xs rounded-lg">
          <source src={finalUrl} />
        </video>
      )}

      {/* FILE (PDF, ZIP, DOC...) */}
      {finalType === "file" && finalUrl && (
        <a
          href={finalUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm underline"
        >
          <FaFileAlt />
          {finalFileName  || "Tải file"}
        </a>
      )}

     
      {finalText && finalText.trim() && (
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
          <FaUserCircle size={36} className="text-gray-400" />
        </div>
      )}

      <div className="max-w-[70%]">
        {/* HEADER: NAME + TIME */}
        <div
          className={`text-xs text-gray-500 mb-1 ${isMe ? "text-right" : "text-left"
            }`}
        >
          {isMe ? "Bạn" : msg.from} - {msg.time}
        </div>

        {/* MESSAGE BUBBLE */}
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
