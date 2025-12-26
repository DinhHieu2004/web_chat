import { v4 as uuidv4 } from "uuid";
import {useEffect, useRef} from "react";

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

    return {
        type: wsType,
        to,
        mes,
    };
};

export const buildPollMessage = (question, options) => {
    if (!question || !Array.isArray(options) || options.length < 2) return null;

    return {
        customType: "poll",
        payload: {
            pollId: uuidv4(),
            question,
            options: options.map(o => ({
                id: uuidv4(),
                text: o,
                votes: 0
            })),

            voteUserNames: [],
            createdAt: Date.now()
        }

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
            votedAt: Date.now()
        }
    }

}

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

    if (isRoom) {
        return to ? `group:${to}` : null;
    }

    const otherUser = from === currentUser ? to : from;
    return otherUser ? `user:${otherUser}` : null;
};

export const parseCustomMessage = (mes) => {
    if (!mes || typeof mes !== "string") return null;
    if (!mes.startsWith("{")) return null;

    try {
        const parsed = JSON.parse(mes);

        // Poll payloads
        if (parsed?.customType === "poll" && parsed?.payload) {
            return {
                customType: "poll",
                type: "poll",
                poll: parsed.payload,
            };
        }

        if (parsed?.customType && parsed?.url) {
            return {
                type: parsed.customType,
                text: parsed.text || "",
                url: parsed.url,
                fileName: parsed.fileName || null,
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

        if (parsed?.customType === "poll" && parsed?.payload) {
            return {
                customType: "poll",
                type: "poll",
                poll: parsed.payload,
            };
        }
        if (parsed?.customType && parsed?.url) {
            return {
                type: parsed.customType,
                url: parsed.url,
                text: parsed.text || "",
                fileName: parsed.fileName || null,
                meta: parsed.meta || null,
            };
        }

        if (parsed?.customType === "emoji" && Array.isArray(parsed?.cps)) {
            const emojiText = parsed.cps
                .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
                .join("");

            return {
                type: "emoji",
                url: null,
                text: emojiText,
                fileName: null,
                meta: parsed.meta || null,
            };
        }
        return {
            type: parsed.customType,
            url: parsed.url,
            text: parsed.text || "",
            fileName: parsed.fileName || null,
            meta: parsed.meta || null,
        };
    } catch (_) { }

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
export const extractRichText = (editor, defaultFont = "Arial", defaultColor = "#000000") => {
    if (!editor) return null;

    const blocks = [];
    const lines = Array.from(editor.childNodes);

    lines.forEach((lineNode) => {
        const block = { spans: [] };

        const traverse = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue;
                if (!text.trim()) return;

                const parent = node.parentElement || editor;
                const style = window.getComputedStyle(parent);

                const span = { text };
                const styles = {};

                if (style.fontWeight === "700") styles.bold = true;
                if (style.fontStyle === "italic") styles.italic = true;
                if (style.textDecoration.includes("underline")) styles.underline = true;
                if (style.textDecoration.includes("line-through")) styles.strike = true;
                if (Object.keys(styles).length) span.styles = styles;

                const font = style.fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
                if (font !== defaultFont) span.font = font;

                const color = style.color;
                if (color !== defaultColor) span.color = color;

                block.spans.push(span);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                node.childNodes.forEach(traverse);
            }
        };

        traverse(lineNode);

        if (block.spans.length) blocks.push(block);
    });

    return { blocks };
};
