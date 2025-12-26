import { v4 as uuidv4 } from "uuid";


export const makeOutgoingPayload = ({type, to, mes}) => {
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
    if( !question || !Array.isArray(options) || options.length <2 ) return null;

    return {
        customType : "poll",
        payload: {
            pollId: uuidv4(),
            question,
            options : options.map(o => ({
                id : uuidv4(),
                text: o,
                votes: 0
            })),

            voteUserNames : [],
            createdAt : Date.now()
        }
       
    };

};

export const buildPollVote = (pollId, optionId, userName) => {
    if(!pollId || !optionId || !userName) return null;

    return {
        customType: "poll_vote",
        payload :{
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


export const makeChatKeyFromWs = ({type, from, to, currentUser}) => {
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
        url: parsed.url,
        text: parsed.text || "",
        fileName: parsed.fileName || null,
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

export const hasEmoji = (s = "") =>
  /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(s);
