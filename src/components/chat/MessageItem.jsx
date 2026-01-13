import React, { useEffect, useRef, useState } from "react";
import {
  FaUserCircle,
  FaFileAlt,
  FaReply,
  FaShare,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { FaVideo, FaPhone, FaPhoneSlash } from "react-icons/fa";
import { FaEllipsisH, FaTrash, FaUndo } from "react-icons/fa";
import LinkifyText from "./LinkifyText";
import MessageReactionBar from "./MessageReactionBar";

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
  } catch (_) {}
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
  onRecall,
  onDeleteForMe,
  onRecallMessage,
  currentUser,
  onToggleReaction,
}) {
  const [openOpt, setOpenOpt] = useState(false);
  const optRef = useRef(null);

  const currentUserId =
    typeof currentUser === "object" && currentUser !== null
      ? currentUser.id
      : currentUser ?? null;

  useEffect(() => {
    const onDown = (e) => {
      if (!optRef.current) return;
      if (!optRef.current.contains(e.target)) setOpenOpt(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  if (
    msg.type === "typing" ||
    msg.type === "call_request" ||
    msg.type === "call_accepted" ||
    msg.type === "call_rejected" ||
    msg.type === "call_signal"
  ) {
    return null;
  }

  const isMe = msg.sender === "user";
  const finalType = msg.type || "text";
  const finalUrl = msg.url || null;

  if (msg?.recalled) {
    return (
      <div className={`flex mb-4 ${isMe ? "justify-end" : "justify-start"}`}>
        {!isMe && (
          <div className="mr-3 mt-1">
            <FaUserCircle size={36} className="text-gray-400 avatar-icon" />
          </div>
        )}

        <div className="max-w-[70%] relative group">
          <div
            className={`text-xs text-gray-500 mb-1 message-time ${
              isMe ? "text-right" : "text-left"
            }`}
          >
            {isMe ? "Bạn" : msg.from} - {msg.time}
          </div>

          <div
            className="px-4 py-2 rounded-lg border
  bg-gray-100 text-gray-600 border-gray-200
  dark:bg-white/10 dark:text-gray-200 dark:border-white/15"
          >
            <span
              className="text-sm italic
    text-gray-500 dark:text-gray-300"
            >
              Tin nhắn đã được thu hồi
            </span>
          </div>
        </div>
      </div>
    );
  }

  const rawMes = typeof msg.mes === "string" ? msg.mes : msg.rawMes || "";

  let callData = null;
  if (finalType === "call_log" && rawMes.startsWith("{")) {
    try {
      callData = JSON.parse(rawMes);
    } catch (e) {
      console.error("Parse call log error:", e);
    }
  }

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
      cps,
      url: m?.url || null,
      fileName: m?.fileName || null,
      blocks: Array.isArray(m?.blocks) ? m.blocks : [],
      rawMes: typeof m?.rawMes === "string" ? m.rawMes : null,
      lat: m?.lat || locationData?.lat,
      lng: m?.lng || locationData?.lng,
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
                    <LinkifyText text={span.text} />
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
            <p className="text-sm wrap-break-words whitespace-pre-wrap">
              {note}
            </p>
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
              <p className="text-sm wrap-break-words whitespace-pre-wrap">
                <LinkifyText text={pvText} />
              </p>
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
        } catch (e) {}
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

    if (finalType === "location") {
      const coords =
        msg.url?.match(/q=([\d.]+),([\d.]+)/) ||
        msg.url?.match(/q=([\d.]+),([\d.]+)/);
      let lat = coords ? coords[1] : msg.lat;
      let lng = coords ? coords[2] : msg.lng;
      if (!lat && msg.mes) {
        try {
          const p = JSON.parse(msg.mes);
          lat = p.lat;
          lng = p.lng;
        } catch (e) {}
      }
      if (lat && lng) {
        return (
          <div className="location-box">
            <p className="m-0.5 text-sm font-medium wrap-break-words text-slate-700">
              {msg.text}
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-200 aspect-square w-full">
              <iframe
                width="100%"
                height="100%"
                src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        );
      }
    }
    if (finalType === "emoji") {
      const decoded = decodeEmojiFromCpsJson(finalText);
      if (decoded) displayEmojiText = decoded;
    }

    if (finalType === "call_log") {
      const isVideo = callData?.callType === "video";
      const isMissed = callData?.wasMissed;

      return (
        <div className="min-w-[220px] py-1">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`p-2.5 rounded-full ${
                isMe
                  ? "bg-white/20 text-white"
                  : isMissed
                  ? "bg-red-100 text-red-500"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {isMissed ? (
                <FaPhoneSlash size={18} />
              ) : isVideo ? (
                <FaVideo size={18} />
              ) : (
                <FaPhone size={18} />
              )}
            </div>

            <div className="flex-1">
              <div
                className={`font-bold text-sm ${
                  !isMe && isMissed ? "text-red-500" : ""
                }`}
              >
                {callData?.text ||
                  (isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại")}
              </div>
              <div
                className={`text-[11px] ${
                  isMe ? "text-purple-100" : "text-gray-500"
                }`}
              >
                {isMissed
                  ? "Nhấn để gọi lại"
                  : callData?.duration || "Đã kết thúc"}
              </div>
            </div>
          </div>

          <button
            onClick={() => onRecall?.(callData?.callType)}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isMe
                ? "bg-white/20 hover:bg-white/30 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-800"
            }`}
          >
            {isVideo ? <FaVideo size={12} /> : <FaPhone size={12} />}
            Gọi lại
          </button>
        </div>
      );
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
          <video
            controls
            className="max-w-xs rounded-lg"
            crossOrigin="anonymous"
          >
            <source
              src={finalUrl}
              type={
                finalFileName?.toLowerCase().endsWith(".webm")
                  ? "video/webm"
                  : "video/mp4"
              }
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
          finalType !== "sticker" &&
          finalType !== "gif" &&
          safeText &&
          safeText.trim() !== "" && (
            <p
              className={`text-sm wrap-break-words whitespace-pre-wrap ${
                finalUrl ? "mt-2" : ""
              }`}
            >
              <LinkifyText text={safeText} />
            </p>
          )}
      </div>
    );
  };

  return (
    <div className={`flex mb-4 ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe && (
        <div className="mr-3 mt-1">
          <FaUserCircle size={36} className="text-gray-400 avatar-icon" />
        </div>
      )}

      <div className="max-w-[70%] relative group">
        <div
          className={`text-xs text-gray-500 mb-1 message-time ${
            isMe ? "text-right" : "text-left"
          }`}
        >
          {isMe ? "Bạn" : msg.from} - {msg.time}
        </div>

        <div
          className={`px-4 py-2 rounded-lg message-bubble ${
            isMe
              ? "bg-linear-to-r from-purple-500 to-blue-500 text-white"
              : "bg-white text-gray-900"
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
                  className={`mb-2 px-2 py-1 rounded border-l-4 text-xs ${
                    isMe
                      ? "bg-white/20 border-white/50"
                      : "bg-gray-200 border-purple-500"
                  }`}
                >
                  <div className="font-semibold truncate">
                    Trả lời{" "}
                    {replyMeta.from === msg.from ? "Bạn" : replyMeta.from}
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
                    <div className="opacity-80 truncate">
                      <LinkifyText text={replyPreviewText} />
                    </div>
                  )}
                </div>
              );
            })()}

          {renderContent()}
        </div>

        {!isMe && (
          <div className="absolute -bottom-2 right-2">
            <MessageReactionBar
              message={msg}
              currentUser={currentUserId}
              onToggleReaction={onToggleReaction}
            />
          </div>
        )}

        <button
          onClick={() => onReply?.(msg)}
          className={`absolute -bottom-1 ${
            isMe ? "-left-8" : "-right-8"
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
          className={`absolute -bottom-1 ${
            isMe ? "-left-16" : "-right-16"
          } opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition p-2`}
          title="Chuyển tiếp"
          type="button"
        >
          <FaShare size={14} />
        </button>
        <div ref={optRef}>
          <button
            onClick={() => setOpenOpt((v) => !v)}
            className={`absolute -bottom-1 ${isMe ? "-left-24" : "-right-24"}
      opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition p-2`}
            title="Tùy chọn"
            type="button"
          >
            <FaEllipsisH size={14} />
          </button>

          {openOpt && (
            <div
              className={`absolute top-6 ${
                isMe ? "right-full mr-2" : "left-full ml-2"
              } w-52
    bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50`}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                type="button"
                onClick={() => {
                  setOpenOpt(false);
                  onDeleteForMe?.(msg);
                }}
              >
                <FaTrash /> Xóa chỉ ở phía tôi
              </button>

              {isMe && (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                  type="button"
                  onClick={() => {
                    setOpenOpt(false);
                    onRecallMessage?.(msg);
                  }}
                >
                  <FaUndo /> Thu hồi tin nhắn
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
