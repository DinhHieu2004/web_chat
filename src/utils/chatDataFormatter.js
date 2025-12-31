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

    if (parsed?.customType === "emoji" && Array.isArray(parsed?.cps)) {
      const emojiText = cpsToEmoji(parsed.cps);

      return {
        type: "emoji",
        text: emojiText,
        url: null,
        fileName: null,
        rawMes: mes,
        meta: parsed?.meta || null,
      };
    }

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

    if (parsed?.customType === "forward") {
      const fwd = parsed?.meta?.forward || {};
      const pv = fwd?.preview || {};

      let displayText =
        typeof parsed.text === "string" && parsed.text.trim() ? parsed.text : "";

      if (!displayText) {
        if (pv?.type === "emoji") {
          const emojiFromCps = cpsToEmoji(pv?.cps);
          displayText =
            emojiFromCps || decodeEmojiFromCpsJson(pv?.text) || "[Emoji]";
        } else if (typeof pv?.text === "string" && pv.text) {
          displayText = pv.text;
        } else if (
          typeof fwd?.previewLabel === "string" &&
          fwd.previewLabel.trim()
        ) {
          displayText = fwd.previewLabel;
        } else {
          displayText = "[Forward]";
        }
      }

      return {
        type: "forward",
        text: displayText,
        url: parsed?.url || null,
        fileName: parsed?.fileName || null,
        meta: parsed?.meta || null,
        rawMes: typeof mes === "string" ? mes : "",
        blocks: Array.isArray(parsed?.blocks) ? parsed.blocks : [],
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

    // Special-case call request payloads so we preserve call-specific fields
    if (ct === "call_request") {
      return {
        customType: "call_request",
        callType: parsed.callType || parsed.type || null,
        roomUrl: parsed.roomUrl || parsed.url || null,
        isGroup: typeof parsed.isGroup === 'boolean' ? parsed.isGroup : !!parsed.isGroup,
        groupName: parsed.groupName || null,
        text: typeof parsed.text === "string" ? parsed.text : "",
        meta: parsed.meta || null,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
        rawMes: text,
      };
    }

    if (ct === "poll" && parsed?.payload) {
      return {
        customType: "poll",
        type: "poll",
        poll: parsed.payload,
      };
    }

    if (ct === "emoji" && Array.isArray(parsed?.cps)) {
      const emojiText = cpsToEmoji(parsed.cps);

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
      const meta = parsed.meta || null;
      const fwd = meta?.forward || {};
      const pv = fwd?.preview || {};

      let displayText =
        typeof parsed.text === "string" && parsed.text.trim() ? parsed.text : "";

      if (!displayText) {
        if (pv?.type === "emoji") {
          const emojiFromCps = cpsToEmoji(pv?.cps);
          displayText =
            emojiFromCps || decodeEmojiFromCpsJson(pv?.text) || "[Emoji]";
        } else if (typeof pv?.text === "string" && pv.text.trim()) {
          displayText = pv.text;
        } else if (
          typeof fwd?.previewLabel === "string" &&
          fwd.previewLabel.trim()
        ) {
          displayText = fwd.previewLabel;
        } else {
          displayText = "[Forward]";
        }
      }

      return {
        type: "forward",
        url: parsed.url || null,
        text: displayText,
        fileName: parsed.fileName || null,
        meta,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
        rawMes: text,
      };
    }

    if (ct) {
      return {
        customType: ct,
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
    cps: msg.cps, 
    blocks: Array.isArray(msg?.blocks) ? msg.blocks : [], 
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
      cps: origin.cps,
      blocks: Array.isArray(origin?.blocks) ? origin.blocks : [],
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
    case "richText":
      return "[Văn bản]";
    default:
      return "[Tin nhắn]";
  }
};

const safeStr = (v) => (typeof v === "string" ? v : "");
const safeObj = (v) => (v && typeof v === "object" ? v : null);


const makePreviewText = (origin) => {
  const t = safeStr(origin?.text) || safeStr(origin?.text?.text);

  if (origin?.type === "emoji") {
    return t; 
  }

  if (typeof origin?.rawMes === "string" && origin.rawMes) return origin.rawMes;
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
  try {
    p = getMessagePreview(origin);
  } catch (_) {}

  const rawText = makePreviewText(origin);
  const previewType = p?.type || origin?.type || "text";

  const richBlocks =
    previewType === "richText" && Array.isArray(origin?.blocks)
      ? origin.blocks
      : previewType === "richText" && Array.isArray(p?.blocks)
      ? p.blocks
      : [];

  let previewText = "";
  let previewCps = null;

  if (previewType === "emoji") {
    if (typeof rawText === "string" && rawText.trim().startsWith("{")) {
      try {
        const obj = JSON.parse(rawText);
        if (obj?.customType === "emoji" && Array.isArray(obj?.cps)) {
          previewCps = obj.cps;
        }
      } catch (_) {}
    }

    if (!previewCps && typeof rawText === "string" && rawText.trim()) {
      previewCps = Array.from(rawText).map((ch) =>
        ch.codePointAt(0).toString(16).toUpperCase()
      );
    }

    if (!previewCps) {
      const t = previewToText(origin); 
      if (typeof t === "string" && t && t !== "[Emoji]") {
        previewCps = Array.from(t).map((ch) =>
          ch.codePointAt(0).toString(16).toUpperCase()
        );
      }
    }

    previewText = "[Emoji]";
  } else if (previewType === "richText") {
    previewText = "[Văn bản]";
  } else {
    previewText = typeof rawText === "string" ? rawText : "";
  }

  return JSON.stringify({
    customType: "forward",
    text: String(note || ""),
    url: p?.url || null,
    fileName: p?.fileName || null,
    blocks: richBlocks.length ? richBlocks : [],
    meta: {
      forward: {
        fromChat: safeStr(originChatObj?.name),
        fromType: safeStr(originChatObj?.type),
        originalFrom: safeStr(originMsgObj?.from),
        originalType: safeStr(origin?.type) || "text",
        preview: {
          type: previewType,
          text: previewText,
          cps: previewCps,
          url: p?.url || null,
          fileName: p?.fileName || null,
          blocks: richBlocks.length ? richBlocks : [],
        },
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

const decodeEmojiFromCpsJson = (raw) => {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s.startsWith("{")) return "";

  try {
    const obj = JSON.parse(s);
    if (obj?.customType === "emoji" && Array.isArray(obj?.cps)) {
      return cpsToEmoji(obj.cps);
    }
  } catch (_) {}

  return "";
};

const cpsToEmoji = (cps) => {
  if (!Array.isArray(cps)) return "";
  return cps.map((hex) => String.fromCodePoint(parseInt(hex, 16))).join("");
};
