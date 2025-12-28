import { v4 as uuidv4 } from "uuid";

export const hasEmoji = (s = "") => /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(s);

export const makeOutgoingPayload = ({ type, to, mes }) => {
  let wsType;

  if (type === "room") {
    wsType = "room";
  } else if (type === "people") {
    wsType = "people";
  } else {
    console.warn("Unknown chat type:", type);
    return null;
  }

  return { type: wsType, to, mes };
};

export const buildPollMessage = (question, options) => {
  if (!question || !Array.isArray(options) || options.length < 2) return null;

  return {
    customType: "poll",
    payload: {
      pollId: uuidv4(),
      question,
      options: options.map((o) => ({
        id: uuidv4(),
        text: o,
        votes: 0,
      })),
      voteUserNames: [],
      createdAt: Date.now(),
    },
  };
};

export const buildPollVote = (pollId, optionId, userName) => {
  if (!pollId || !optionId || !userName) return null;

  return {
    customType: "poll_vote",
    payload: {
      pollId,
      optionId,
      userName,
      votedAt: Date.now(),
    },
  };
};

export const makeChatKeyFromActive = (chat) => {
  if (!chat) return null;

  if (chat.type === "room") return `group:${chat.name}`;
  if (chat.type === "people") return `user:${chat.name}`;

  return null;
};

export const formatVNDateTime = (isoLike) => {
  const d = isoLike ? new Date(isoLike) : new Date();

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const DD = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const YYYY = d.getFullYear();

  return `${hh}:${mm} ${DD}-${MM}-${YYYY}`;
};

export const makeChatKeyFromWs = ({ type, from, to, currentUser }) => {
  const isRoom = type === "room" || type === 1;
  if (isRoom) return to ? `group:${to}` : null;

  const otherUser = from === currentUser ? to : from;
  return otherUser ? `user:${otherUser}` : null;
};

export const parseCustomMessage = (mes) => {
  if (!mes || typeof mes !== "string") return null;
  if (!mes.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(mes);

    if (parsed?.customType === "poll" && parsed?.payload) {
      return {
        type: "poll",
        poll: parsed.payload,
      };
    }

    if (parsed?.customType && parsed?.url) {
      return {
        type: parsed.customType,
        text: typeof parsed.text === "string" ? parsed.text : "",
        url: parsed.url,
        fileName: parsed.fileName || null,
        meta: parsed.meta || null,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      };
    }

    if (parsed?.customType === "emoji" && Array.isArray(parsed.cps)) {
      const text = parsed.cps
        .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
        .join("");

      return {
        type: "emoji",
        text,
        url: null,
        fileName: null,
        meta: parsed.meta || null,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      };
    }

    if (parsed?.customType === "forward") {
      return {
        type: "forward",
        text: typeof parsed.text === "string" ? parsed.text : "",
        url: parsed.url || null,
        fileName: parsed.fileName || null,
        meta: parsed.meta || null,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      };
    }
  } catch (e) {
    return null;
  }

  return null;
};

export const tryParseCustomPayload = (text) => {
  if (!text || typeof text !== "string") return null;
  if (text.length < 10 || !text.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(text);
    const ct = parsed?.customType;

    if (ct === "poll" && parsed?.payload) {
      return {
        customType: "poll",
        type: "poll",
        poll: parsed.payload,
      };
    }

    if (ct === "emoji" && Array.isArray(parsed?.cps)) {
      const emojiText = parsed.cps
        .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
        .join("");

      return {
        type: "emoji",
        url: null,
        text: emojiText,
        fileName: null,
        meta: parsed.meta || null,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
        rawMes: text,
      };
    }

    if (ct === "forward") {
      return {
        type: "forward",
        url: parsed.url || null,
        text: typeof parsed.text === "string" ? parsed.text : "",
        fileName: parsed.fileName || null,
        meta: parsed.meta || null,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      };
    }

    if (ct) {
      return {
        type: ct,
        url: parsed.url || null,
        text: typeof parsed.text === "string" ? parsed.text : "",
        fileName: parsed.fileName || null,
        meta: parsed.meta || null,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
        poll: parsed.payload || null,
      };
    }
  } catch (_) {}

  return null;
};

export const buildEmojiMessage = (text) => {
  const cps = Array.from(text).map((ch) =>
    ch.codePointAt(0).toString(16).toUpperCase()
  );

  return JSON.stringify({
    customType: "emoji",
    cps,
  });
};

export const extractMessageText = (msg) => {
  if (!msg) return "";

  if (typeof msg === "string") {
    try {
      msg = JSON.parse(msg);
    } catch {
      return msg;
    }
  }

  if (typeof msg.text === "string" && msg.text.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msg.text);
      return parsed.text || parsed.fileName || "";
    } catch {
      return msg.text;
    }
  }

  return msg.text || msg.type || "";
};

export const getMessagePreview = (msg) => {
  if (!msg) return null;

  return {
    type: msg.type,
    text: msg.text,
    url: msg.url,
    fileName: msg.fileName,
  };
};

export const getPurePreview = (msg, messageMap) => {
  if (!msg) return null;

  const reply = msg?.meta?.reply;
  if (!reply) {
    return {
      type: "text",
      text: extractMessageText(msg),
    };
  }

  if (reply.preview && typeof reply.preview === "object") {
    return reply.preview;
  }

  const origin = messageMap?.[reply.msgId];
  if (origin) {
    return {
      type: origin.type,
      text: origin.text,
      url: origin.url,
      fileName: origin.fileName,
    };
  }

  if (typeof reply.preview === "string") {
    return { type: reply.preview };
  }

  return { type: "text", text: "" };
};

export const previewToText = (msg) => {
  const p = getMessagePreview(msg);
  if (!p) return "";

  if (typeof p.text === "string" && p.text.trim()) return p.text;
  if (typeof p.fileName === "string" && p.fileName.trim()) return p.fileName;

  switch (p.type) {
    case "image":
      return "[Hình ảnh]";
    case "gif":
      return "[GIF]";
    case "sticker":
      return "[Sticker]";
    case "video":
      return "[Video]";
    case "audio":
      return "[Ghi âm]";
    case "file":
      return "[Tệp đính kèm]";
    case "emoji":
      return "[Emoji]";
    default:
      return "[Tin nhắn]";
  }
};

const safeStr = (v) => (typeof v === "string" ? v : "");
const safeObj = (v) => (v && typeof v === "object" ? v : null);

const makePreviewText = (origin) => {
  if (typeof origin?.rawMes === "string" && origin.rawMes) return origin.rawMes;

  const t = safeStr(origin?.text) || safeStr(origin?.text?.text);
  if (origin?.type === "emoji" && t) return buildEmojiMessage(t);

  return t;
};

export const buildForwardMessage = ({ originMsg, originChat, note = "" }) => {
  const originMsgObj = safeObj(originMsg) || {};
  const originChatObj = safeObj(originChat) || {};

  const previewFromForward = safeObj(originMsgObj?.meta?.forward?.preview);
  const origin =
    originMsgObj?.type === "forward" && previewFromForward
      ? previewFromForward
      : originMsgObj;
  let p = null;
  let previewLabel = "";
  try {
    p = getMessagePreview(origin);
  } catch (_) {}
  try {
    previewLabel = previewToText(origin);
  } catch (_) {}

  const rawText = makePreviewText(origin);

  return JSON.stringify({
    customType: "forward",
    text: String(note || previewLabel || ""),
    url: p?.url || null,
    fileName: p?.fileName || null,
    meta: {
      forward: {
        fromChat: safeStr(originChatObj?.name),
        fromType: safeStr(originChatObj?.type),
        originalFrom: safeStr(originMsgObj?.from),
        originalType: safeStr(origin?.type) || "text",
        preview: {
          type: p?.type || origin?.type || "text",
          text: safeStr(origin?.text) || safeStr(origin?.text?.text) || "", 
          rawMes: rawText, 
          url: p?.url || null,
          fileName: p?.fileName || null,
        },
        previewLabel: String(previewLabel || ""),
        note: String(note || ""),
      },
    },
  });
};

export const extractRichText = (
  editor,
  defaultFont = "Arial",
  defaultColor = "#000000"
) => {
  if (!editor) return null;

  const blocks = [];
  let plainText = "";

  const createBlockIfNeeded = () => {
    if (blocks.length === 0 || !blocks[blocks.length - 1]) {
      blocks.push({ spans: [] });
    }
  };

  const traverse = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (!text) return;

      const parent = node.parentElement || editor;
      const style = window.getComputedStyle(parent);

      const span = { text };
      const styles = {};

      if (
        style.fontWeight === "700" ||
        (style.fontWeight && parseInt(style.fontWeight, 10) >= 700)
      )
        styles.bold = true;
      if (style.fontStyle === "italic") styles.italic = true;
      if (style.textDecoration.includes("underline")) styles.underline = true;
      if (style.textDecoration.includes("line-through")) styles.strike = true;
      if (Object.keys(styles).length) span.styles = styles;

      const font = style.fontFamily
        .split(",")[0]
        .trim()
        .replace(/^['"]|['"]$/g, "");
      if (font && font !== defaultFont) span.font = font;

      const color = style.color;
      if (color && color !== defaultColor) span.color = color;

      const fontSize = style.fontSize;
      if (fontSize) span.fontSize = fontSize;

      createBlockIfNeeded();
      blocks[blocks.length - 1].spans.push(span);
      plainText += text;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.nodeName === "BR") {
        blocks.push({ spans: [] });
        plainText += "\n";
      } else if (["DIV", "P"].includes(node.nodeName)) {
        blocks.push({ spans: [] });
        node.childNodes.forEach(traverse);
        blocks.push(null);
        plainText += "\n";
      } else {
        node.childNodes.forEach(traverse);
      }
    }
  };

  editor.childNodes.forEach(traverse);
  const finalBlocks = blocks.filter((b) => b && b.spans.length > 0);

  return { blocks: finalBlocks, text: plainText };
};
