import { useState, useEffect, useRef } from "react";
import { chatSocketServer } from "../services/socket";
import { uploadFileToS3 } from "../services/fileUploader";
import {
  parseCustomMessage,
  buildEmojiMessage,
  makeOutgoingPayload,
  makeChatKeyFromActive,
  formatVNDateTime,
  makeChatKeyFromWs,
} from "../utils/chatDataFormatter";
import { setListUser } from "../redux/slices/listUserSlice.js";
import { useDispatch } from "react-redux";

const tryParseCustomPayload = (text) => {
  if (!text || typeof text !== "string") return null;
  if (text.length < 10 || !text.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(text);

    if (parsed?.customType) {
      return {
        type: parsed.customType,
        url: parsed.url || null,
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
  } catch (_) {}

  return null;
};

const hasEmoji = (s = "") => /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(s);

export default function useChatLogic({ activeChat, setActiveChat, currentUser }) {
  const [messagesMap, setMessagesMap] = useState({});
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [replyMsg, setReplyMsg] = useState(null);
  const clearReply = () => setReplyMsg(null);

    // const [forwardMsg, setForwardMsg] = useState(null);
  const dispatch = useDispatch();

  const messagesEndRef = useRef(null);
  const chatKey = makeChatKeyFromActive(activeChat);
  const messages = chatKey ? messagesMap[chatKey] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onIncoming = (payload) => {
      const d = payload?.data?.data || payload?.data || payload || {};
      const { type, to, mes } = d;
      const from = d.from ?? d.name;

      if (!mes) return;

      const incomingKey = makeChatKeyFromWs({
        type,
        from,
        to,
        currentUser,
      });
      if (!incomingKey) return;
      if (from === currentUser) return;

      const parsed = parseCustomMessage(mes);

      const finalType = parsed?.type || "text";
      const finalUrl = parsed?.url || null;
      const finalText = parsed?.text ?? mes;
      const finalFileName = parsed?.fileName || null;

      setMessagesMap((prev) => ({
        ...prev,
        [incomingKey]: [
          ...(prev[incomingKey] || []),
          {
            id: Date.now() + Math.random(),
              raw: mes,
            text: finalText,
            sender: "other",
            time: formatVNDateTime(),
            type: finalType,
            from,
            to,
            url: finalUrl,
            fileName: finalFileName,
              meta: parsed?.meta || null,
          },
        ],
      }));
    };

    const onHistory = (payload) => {
      const { status, event, data } = payload || {};
      if (status !== "success") return;

      const mapHistoryMessage = (m) => {
        const parsed = tryParseCustomPayload(m.mes);
        return {
          id: m.id ?? Date.now() + Math.random(),
          text: parsed?.text ?? m.mes ?? "",
          sender: m.name === currentUser ? "user" : "other",
          time: formatVNDateTime(m.createAt),
          type: parsed?.type || m.messageType || "text",
          from: m.name,
          to: m.to,
          url: parsed?.url || m.url || null,
          fileName: parsed?.fileName || null,
            meta: parsed?.meta ?? null,
        };
      };

      if (event === "GET_PEOPLE_CHAT_MES" && Array.isArray(data)) {
        const otherUser =
          data[0]?.name === currentUser ? data[0]?.to : data[0]?.name;
        if (!otherUser) return;

        setMessagesMap((prev) => ({
          ...prev,
          [`user:${otherUser}`]: data.slice().reverse().map(mapHistoryMessage),
        }));
      }

      if (event === "GET_ROOM_CHAT_MES" && Array.isArray(data?.chatData)) {
        setMessagesMap((prev) => ({
          ...prev,
          [`group:${data.name}`]: data.chatData
            .slice()
            .reverse()
            .map(mapHistoryMessage),
        }));
      }
    };

    chatSocketServer.on("SEND_CHAT", onIncoming);
    chatSocketServer.on("GET_ROOM_CHAT_MES", onHistory);
    chatSocketServer.on("GET_PEOPLE_CHAT_MES", onHistory);

    return () => {
      chatSocketServer.off("SEND_CHAT", onIncoming);
      chatSocketServer.off("GET_ROOM_CHAT_MES", onHistory);
      chatSocketServer.off("GET_PEOPLE_CHAT_MES", onHistory);
    };
  }, [currentUser]);
    const startReply = (msg) => {
        setReplyMsg(msg);
    };
    const extractMessageText = (msg) => {
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
                return parsed.text || parsed.customType || parsed.type || "";
            } catch {
                return msg.text;
            }
        }

        return msg.text || msg.type || "";
    };
    const getMessagePreview = (msg) => {
        return extractMessageText(msg);
    };
    const getPurePreview = (msg) => {
        if (!msg) return "";

        if (msg?.meta?.reply?.preview) {
            return msg.meta.reply.preview;
        }

        return extractMessageText(msg);
    };

    const attachReplyMeta = (mes) => {
        if (!replyMsg) return mes;

        const replyMeta = {
            reply: {
                msgId: replyMsg.id,
                from: replyMsg.from,
                type: replyMsg.type,
                preview:  getMessagePreview(replyMsg),
            },
        };

        if (typeof mes === "string" && !mes.startsWith("{")) {
            return JSON.stringify({
                customType: "text",
                text: mes,
                meta: replyMeta,
            });
        }

        try {
            const parsed = JSON.parse(mes);
            return JSON.stringify({
                ...parsed,
                meta: replyMeta,
            });
        } catch {
            return mes;
        }
    };

    const handleSend = () => {
    if (!activeChat) return;

    const text = input.trim();
    if (!text) return;

    let mesToSend = hasEmoji(text) ? buildEmojiMessage(text) : text;
    mesToSend = attachReplyMeta(mesToSend);

    chatSocketServer.send(
      "SEND_CHAT",
      makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: mesToSend,
      })
    );

    const optimisticType = hasEmoji(text) ? "emoji" : "text";
        const replyMeta = replyMsg
            ? {
                reply: {
                    msgId: replyMsg.id,
                    from: replyMsg.from,
                    type: replyMsg.type,
                    preview: getMessagePreview(replyMsg),
                },
            }
            : null;
    setMessagesMap((prev) => ({
      ...prev,
      [chatKey]: [
        ...(prev[chatKey] || []),
        {
          id: `local-${Date.now()}`,
          text,
          sender: "user",
          time: formatVNDateTime(),
          type: optimisticType,
          from: currentUser,
          to: activeChat.name,
          optimistic: true,
            meta: replyMeta,
        },
      ],
    }));

    dispatch(
      setListUser({
        name: activeChat.name,
        lastMessage: text,
        actionTime: Date.now(),
        type: activeChat.type,
      })
    );
        setReplyMsg(null);

        setInput("");
  };

  const handleFileUpload = async (file) => {
    if (!activeChat || !file) return;

    setIsUploading(true);

    try {
      const url = await uploadFileToS3(file);
      if (!url) return;

      const ext = file.name.split(".").pop()?.toLowerCase();
      const type = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
        ? "image"
        : ["mp4", "webm"].includes(ext)
        ? "video"
        : ["mp3", "wav", "ogg", "webm"].includes(ext)
        ? "audio"
        : "file";

      const captionText = input.trim();

      let payloadText = JSON.stringify({
        customType: type,
        url,
        text: captionText,
        fileName: file.name,
      });
      payloadText = attachReplyMeta(payloadText);
      setInput("");

      chatSocketServer.send(
        "SEND_CHAT",
        makeOutgoingPayload({
          type: activeChat.type,
          to: activeChat.name,
          mes: payloadText,
        })
      );

      setMessagesMap((prev) => ({
        ...prev,
        [chatKey]: [
          ...(prev[chatKey] || []),
          {
            id: `local-${Date.now()}`,
            text: captionText,
            sender: "user",
            time: formatVNDateTime(),
            type,
            from: currentUser,
            to: activeChat.name,
            url,
            fileName: file.name,
            optimistic: true,
          },
        ],
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendSticker = (sticker) => {
    if (!activeChat || !sticker?.url) return;

    const payloadText = JSON.stringify({
      customType: "sticker",
      stickerId: sticker.id,
      url: sticker.url,
      text: "",
    });

    chatSocketServer.send(
      "SEND_CHAT",
      makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: payloadText,
      })
    );

    setMessagesMap((prev) => ({
      ...prev,
      [chatKey]: [
        ...(prev[chatKey] || []),
        {
          id: `local-${Date.now()}`,
          text: "",
          sender: "user",
          time: formatVNDateTime(),
          type: "sticker",
          from: currentUser,
          to: activeChat.name,
          url: sticker.url,
          optimistic: true,
        },
      ],
    }));
  };

  const handleSendGif = (gif) => {
    if (!activeChat || !gif?.url) return;

    const payloadText = JSON.stringify({
      customType: "gif",
      gifId: gif.id,
      url: gif.url,
      text: "",
    });

    chatSocketServer.send(
      "SEND_CHAT",
      makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: payloadText,
      })
    );

    setMessagesMap((prev) => ({
      ...prev,
      [chatKey]: [
        ...(prev[chatKey] || []),
        {
          id: `local-${Date.now()}`,
          text: "",
          sender: "user",
          time: formatVNDateTime(),
          type: "gif",
          from: currentUser,
          to: activeChat.name,
          url: gif.url,
          optimistic: true,
        },
      ],
    }));
  };

  const loadHistory = (page = 1, chat = activeChat) => {
    if (!chat) return;

    chatSocketServer.send(
      chat.type === "room" ? "GET_ROOM_CHAT_MES" : "GET_PEOPLE_CHAT_MES",
      { name: chat.name, page }
    );
  };

  const handleChatSelect = (contact) => {
    setActiveChat(contact);
    loadHistory(1, contact);
    setShowEmojiPicker(false);
    setShowStickerPicker(false);
    setShowGroupMenu(false);
  };

  return {
    activeChat,
    messages,
    input,
    setInput,
    searchTerm,
    setSearchTerm,
    messagesEndRef,
    isUploading,
    showEmojiPicker,
    showStickerPicker,
    showGroupMenu,
    toggleEmojiPicker: () => setShowEmojiPicker((v) => !v),
    toggleStickerPicker: () => setShowStickerPicker((v) => !v),
    toggleGroupMenu: () => setShowGroupMenu((v) => !v),
    handlers: {
      handleSend,
      handleChatSelect,
      loadHistory,
      handleFileUpload,
      handleSendSticker,
      handleSendGif, startReply, replyMsg, clearReply, getPurePreview, getMessagePreview
    },
  };
}
