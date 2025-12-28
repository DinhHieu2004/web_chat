import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { chatSocketServer } from "../services/socket";
import { uploadFileToS3 } from "../services/fileUploader";
import { buildForwardMessage } from "../utils/chatDataFormatter";
import { usePollActions } from "./handleSendPoll";

import {
  tryParseCustomPayload,
  buildEmojiMessage,
  makeOutgoingPayload,
  makeChatKeyFromActive,
  formatVNDateTime,
  makeChatKeyFromWs,
  getMessagePreview,
  getPurePreview,
  hasEmoji,
  extractRichText,
} from "../utils/chatDataFormatter";

import { addMessage, setHistory } from "../redux/slices/chatSlice";
import { selectMessagesByChatKey } from "../redux/selectors/chatSelector";
import { setListUser } from "../redux/slices/listUserSlice";

import {
  buildSenderOptions,
  filterBySender,
  filterByDate,
} from "../utils/chatSearchUtils";

export default function useChatLogic({
  activeChat,
  setActiveChat,
  currentUser,
}) {
  const dispatch = useDispatch();

  // ---------- UI STATE ----------
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // reply
  const [replyMsg, setReplyMsg] = useState(null);
  const clearReply = () => setReplyMsg(null);

  // search panel
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const toggleSearchPanel = () => setShowSearchPanel((v) => !v);
  const closeSearchPanel = () => setShowSearchPanel(false);

  // ---------- DATA ----------
  const chatKey = makeChatKeyFromActive(activeChat);

  const { handleSendPoll, handleSendPollVote } = usePollActions({
    activeChat,
    chatKey,
    currentUser,
  });

  const messages = useSelector(
    chatKey ? selectMessagesByChatKey(chatKey) : () => []
  );

  // ---------- FORWARD ----------
  const [forwardMsg, setForwardMsg] = useState(null);
  const [forwardPreview, setForwardPreview] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const contacts = useSelector((state) => state?.listUser?.list || []);

  const startForward = (payload) => {
    try {
      const msg = payload?.message ?? payload;
      const preview = payload?.preview ?? null;

      setForwardMsg(msg);

      let pv = preview;
      if (!pv) {
        try {
          pv = getPurePreview?.(msg);
        } catch (_) {}
        if (!pv) {
          try {
            pv = getMessagePreview?.(msg);
          } catch (_) {}
        }
      }

      setForwardPreview(pv || { type: "text", text: "" });
      setShowForwardModal(true);
    } catch (e) {
      console.error("[startForward] crash:", e);
    }
  };

  const closeForward = () => {
    setForwardMsg(null);
    setForwardPreview(null);
    setShowForwardModal(false);
  };

  const handleConfirmForward = ({ selectedMap, note }) => {
    if (!forwardMsg || !activeChat) return;

    const payloadText = buildForwardMessage({
      originMsg: forwardMsg,
      originChat: activeChat,
      note,
    });

    const keys = Object.keys(selectedMap || {}).filter((k) => selectedMap[k]);
    const parsedForward = tryParseCustomPayload(payloadText);
    const now = Date.now();

    keys.forEach((k) => {
      const [type, name] = String(k).split(":");
      if (!type || !name) return;

      const outgoing = makeOutgoingPayload({
        type: type === "room" ? "room" : "people",
        to: name,
        mes: payloadText,
      });

      chatSocketServer.send("SEND_CHAT", outgoing);
      const targetChatKey = type === "room" ? `group:${name}` : `user:${name}`;

      dispatch(
        addMessage({
          chatKey: targetChatKey,
          message: {
            id: `local-forward-${now}-${Math.random()}`,
            text: parsedForward?.text || "[Forward]",
            sender: "user",
            actionTime: now,
            time: formatVNDateTime(now),
            type: parsedForward?.type || "forward",
            from: currentUser,
            to: name,
            rawMes: payloadText,
            meta: parsedForward?.meta || null,
            url: parsedForward?.url || null,
            fileName: parsedForward?.fileName || null,
            optimistic: true,
          },
        })
      );

      dispatch(
        setListUser({
          name,
          lastMessage: parsedForward?.text || "[Forward]",
          actionTime: now,
          type: type === "room" ? "room" : "people",
        })
      );
    });

    closeForward();
  };

  // ---------- SEARCH QUERY + FILTERS ----------
  const norm = (s = "") => String(s).toLowerCase().trim();
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [senderFilter, setSenderFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const messageRefs = useRef({});

  const matchedMessages = useMemo(() => {
    const q = norm(messageSearchQuery);
    if (!q) return [];
    return (messages || []).filter((m) => norm(m?.text || "").includes(q));
  }, [messages, messageSearchQuery]);

  const matchIds = useMemo(
    () => matchedMessages.map((m) => m.id),
    [matchedMessages]
  );

  const senderOptions = useMemo(
    () => buildSenderOptions(messages || []),
    [messages]
  );

  const filteredResults = useMemo(() => {
    return (matchedMessages || []).filter(
      (m) => filterBySender(m, senderFilter) && filterByDate(m, dateFilter)
    );
  }, [matchedMessages, senderFilter, dateFilter]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [messageSearchQuery, chatKey]);

  useEffect(() => {
    setMessageSearchQuery("");
    setSenderFilter("ALL");
    setDateFilter("ALL");
  }, [chatKey]);

  const scrollToMatchById = (id) => {
    if (!id) return;
    const el = messageRefs.current?.[id];
    if (el?.scrollIntoView)
      el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const scrollToMatchIndex = (idx) => {
    if (!matchIds.length) return;
    const safeIdx = Math.max(0, Math.min(idx, matchIds.length - 1));
    setActiveMatchIndex(safeIdx);
    scrollToMatchById(matchIds[safeIdx]);
  };

  const gotoNextMatch = () => {
    if (!matchIds.length) return;
    scrollToMatchIndex((activeMatchIndex + 1) % matchIds.length);
  };

  const gotoPrevMatch = () => {
    if (!matchIds.length) return;
    scrollToMatchIndex(
      (activeMatchIndex - 1 + matchIds.length) % matchIds.length
    );
  };

  // ---------- SCROLL TO BOTTOM ----------
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- SOCKET INCOMING + HISTORY ----------
  useEffect(() => {
    if (!currentUser) return;

    const onIncoming = (payload) => {
      const d = payload?.data?.data || payload?.data || payload || {};
      const { name, from: fromRaw, to, mes, type } = d;

      const from = fromRaw || name;
      const rawText =
        typeof mes === "string" ? mes : mes?.mes ?? mes?.text ?? "";

      const parsed = tryParseCustomPayload(
        typeof mes === "string" ? mes : mes?.mes
      );
      const incomingKey = makeChatKeyFromWs({ type, from, to, currentUser });
      if (!incomingKey) return;

      const now = Date.now();

      dispatch(
        addMessage({
          chatKey: incomingKey,
          message: {
            id: now + Math.random(),
            text: parsed ? parsed.text : rawText || "",
            sender: from === currentUser ? "user" : "other",
            actionTime: now,
            time: formatVNDateTime(now),
            type: parsed?.type || "text",
            from,
            to,
            rawMes:
              typeof parsed?.rawMes === "string" ? parsed.rawMes : rawText,
            url: parsed?.url || null,
            fileName: parsed?.fileName || null,
            meta: parsed?.meta || null,
            blocks: parsed?.blocks || [],
          },
        })
      );

      try {
        const contactName = incomingKey.split(":")[1];
        dispatch(
          setListUser({
            name: contactName,
            lastMessage: parsed ? parsed.text : rawText || "",
            actionTime: now,
            type: type === "room" || type === 1 ? "room" : "people",
          })
        );
      } catch (_) {}
    };

    const onHistory = (payload) => {
      const { status, event, data } = payload || {};
      if (status !== "success") return;

      const mapHistoryMessage = (m) => {
        const parsed = tryParseCustomPayload(m?.mes);
        if (parsed?.customType === "typing") return null;

        const ts = m?.createAt ? Date.parse(m.createAt) : 0;
        const actionTime = Number.isNaN(ts) ? 0 : ts;

        return {
          id: m?.id ?? (actionTime || Date.now() + Math.random()),
          text: parsed ? parsed.text : m?.mes || "",
          sender: m?.name === currentUser ? "user" : "other",
          actionTime,
          time: formatVNDateTime(m?.createAt || actionTime || Date.now()),
          type: parsed?.type || m?.messageType || "text",
          from: m?.name,
          to: m?.to,
          rawMes:
            typeof parsed?.rawMes === "string" ? parsed.rawMes : m?.mes || "",
          url: parsed?.url || m?.url || null,
          fileName: parsed?.fileName || null,
          meta: parsed?.meta || null,
          blocks: parsed?.blocks || [],
        };
      };

      if (event === "GET_PEOPLE_CHAT_MES" && Array.isArray(data)) {
        const otherUser =
          data[0]?.name === currentUser ? data[0]?.to : data[0]?.name;
        dispatch(
          setHistory({
            chatKey: `user:${otherUser}`,
            messages: data
              .slice()
              .reverse()
              .map(mapHistoryMessage)
              .filter(Boolean),
          })
        );
      }

      if (event === "GET_ROOM_CHAT_MES" && Array.isArray(data?.chatData)) {
        dispatch(
          setHistory({
            chatKey: `group:${data.name}`,
            messages: data.chatData
              .slice()
              .reverse()
              .map(mapHistoryMessage)
              .filter(Boolean),
          })
        );
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
  }, [currentUser, dispatch]);

  // ---------- REPLY META ----------
  const startReply = (msg) => setReplyMsg(msg);

  const buildReplyMeta = () => {
    if (!replyMsg) return null;
    return {
      reply: {
        msgId: replyMsg.id,
        from: replyMsg.from,
        type: replyMsg.type,
        preview: getMessagePreview(replyMsg),
      },
    };
  };

  const attachReplyMeta = (mes) => {
    if (!replyMsg) return mes;

    const replyMeta = buildReplyMeta();

    if (typeof mes === "string" && !mes.startsWith("{")) {
      return JSON.stringify({
        customType: "text",
        text: mes,
        meta: replyMeta,
      });
    }

    try {
      const parsed = JSON.parse(mes);
      return JSON.stringify({ ...parsed, meta: replyMeta });
    } catch {
      return mes;
    }
  };

  // ---------- SEND: FILE UPLOAD ----------
  const handleFileUpload = async (file) => {
    if (!activeChat || !file) return;
    const captionText = input.trim();

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

      const payloadText = attachReplyMeta(
        JSON.stringify({
          customType: type,
          url,
          text: captionText,
          fileName: file.name,
        })
      );

      setInput("");

      chatSocketServer.send(
        "SEND_CHAT",
        makeOutgoingPayload({
          type: activeChat.type,
          to: activeChat.name,
          mes: payloadText,
        })
      );

      const now = Date.now();
      dispatch(
        addMessage({
          chatKey,
          message: {
            id: `local-${now}`,
            text: captionText,
            sender: "user",
            actionTime: now,
            time: formatVNDateTime(now),
            type,
            from: currentUser,
            to: activeChat.name,
            url,
            fileName: file.name,
            optimistic: true,
            meta: buildReplyMeta() || null,
          },
        })
      );

      dispatch(
        setListUser({
          name: activeChat.name,
          lastMessage: captionText || `[${String(type).toUpperCase()}]`,
          actionTime: now,
          type: activeChat.type,
        })
      );

      setReplyMsg(null);
    } finally {
      setIsUploading(false);
    }
  };

  // ---------- SEND: RICH TEXT ----------
  const handleSendRichText = (editorRef) => {
    const richJson = extractRichText?.(editorRef);
    if (!richJson || !activeChat) return;

    const now = Date.now();

    let payload = JSON.stringify({
      customType: "richText",
      text: richJson.text,
      blocks: richJson.blocks,
    });

    payload = attachReplyMeta(payload);

    chatSocketServer.send(
      "SEND_CHAT",
      makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: payload,
      })
    );

    dispatch(
      addMessage({
        chatKey,
        message: {
          id: `local-${now}`,
          text: "",
          blocks: richJson.blocks,
          sender: "user",
          actionTime: now,
          time: formatVNDateTime(now),
          type: "richText",
          from: currentUser,
          to: activeChat.name,
          optimistic: true,
          meta: buildReplyMeta() || null,
        },
      })
    );

    dispatch(
      setListUser({
        name: activeChat.name,
        lastMessage: richJson.text || "[RICH]",
        actionTime: now,
        type: activeChat.type,
      })
    );
  };

  // ---------- SEND: TEXT / EMOJI ----------
  const handleSend = () => {
    if (!activeChat) return;

    const text = input.trim();
    if (!text) return;

    let mes = hasEmoji(text) ? buildEmojiMessage(text) : text;
    mes = attachReplyMeta(mes);

    chatSocketServer.send(
      "SEND_CHAT",
      makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes,
      })
    );

    const now = Date.now();
    dispatch(
      addMessage({
        chatKey,
        message: {
          id: `local-${now}`,
          text,
          sender: "user",
          actionTime: now,
          time: formatVNDateTime(now),
          type: hasEmoji(text) ? "emoji" : "text",
          from: currentUser,
          to: activeChat.name,
          optimistic: true,
          meta: buildReplyMeta() || null,
        },
      })
    );

    dispatch(
      setListUser({
        name: activeChat.name,
        lastMessage: text,
        actionTime: now,
        type: activeChat.type,
      })
    );

    setReplyMsg(null);
    setInput("");
  };

  // ---------- SEND: VOICE ----------
  const handleSendVoice = async (audioBlob) => {
    if (!activeChat || !audioBlob) return;

    setIsUploading(true);
    try {
      const fileName = `voice-${Date.now()}.webm`;
      const audioFile = new File([audioBlob], fileName, {
        type: audioBlob.type || "audio/webm",
      });

      const url = await uploadFileToS3(audioFile);
      if (!url) return;

      const payloadText = attachReplyMeta(
        JSON.stringify({
          customType: "audio",
          url,
          fileName,
        })
      );

      chatSocketServer.send(
        "SEND_CHAT",
        makeOutgoingPayload({
          type: activeChat.type,
          to: activeChat.name,
          mes: payloadText,
        })
      );

      const now = Date.now();
      dispatch(
        addMessage({
          chatKey,
          message: {
            id: `local-${now}`,
            sender: "user",
            actionTime: now,
            time: formatVNDateTime(now),
            type: "audio",
            from: currentUser,
            to: activeChat.name,
            url,
            fileName,
            optimistic: true,
            meta: buildReplyMeta() || null,
          },
        })
      );

      dispatch(
        setListUser({
          name: activeChat.name,
          lastMessage: "[Voice]",
          actionTime: now,
          type: activeChat.type,
        })
      );

      setReplyMsg(null);
    } finally {
      setIsUploading(false);
    }
  };

  // ---------- SEND: STICKER ----------
  const handleSendSticker = (sticker) => {
    if (!activeChat || !sticker?.url) return;

    const payloadText = attachReplyMeta(
      JSON.stringify({
        customType: "sticker",
        stickerId: sticker.id,
        url: sticker.url,
      })
    );

    chatSocketServer.send(
      "SEND_CHAT",
      makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: payloadText,
      })
    );

    const now = Date.now();
    dispatch(
      addMessage({
        chatKey,
        message: {
          id: `local-${now}`,
          sender: "user",
          actionTime: now,
          time: formatVNDateTime(now),
          type: "sticker",
          from: currentUser,
          to: activeChat.name,
          url: sticker.url,
          optimistic: true,
          meta: buildReplyMeta() || null,
        },
      })
    );

    setReplyMsg(null);
  };

  // ---------- SEND: GIF ----------
  const handleSendGif = (gif) => {
    if (!activeChat || !gif?.url) return;

    const payloadText = attachReplyMeta(
      JSON.stringify({
        customType: "gif",
        gifId: gif.id,
        url: gif.url,
      })
    );

    chatSocketServer.send(
      "SEND_CHAT",
      makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: payloadText,
      })
    );

    const now = Date.now();
    dispatch(
      addMessage({
        chatKey,
        message: {
          id: `local-${now}`,
          sender: "user",
          actionTime: now,
          time: formatVNDateTime(now),
          type: "gif",
          from: currentUser,
          to: activeChat.name,
          url: gif.url,
          optimistic: true,
          meta: buildReplyMeta() || null,
        },
      })
    );

    dispatch(
      setListUser({
        name: activeChat.name,
        lastMessage: "[GIF]",
        actionTime: now,
        type: activeChat.type,
      })
    );

    setReplyMsg(null);
  };

  // ---------- LOAD HISTORY ----------
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
    showSearchPanel,
    toggleSearchPanel,
    closeSearchPanel,

    messageSearchQuery,
    setMessageSearchQuery,
    senderFilter,
    setSenderFilter,
    dateFilter,
    setDateFilter,
    senderOptions,
    matchedMessages,
    filteredResults,

    messageRefs,
    matchIds,
    activeMatchIndex,
    gotoNextMatch,
    gotoPrevMatch,
    scrollToMatchById,

    toggleEmojiPicker: () => setShowEmojiPicker((v) => !v),
    toggleStickerPicker: () => setShowStickerPicker((v) => !v),
    toggleGroupMenu: () => setShowGroupMenu((v) => !v),

    replyMsg,
    clearReply,
    getPurePreview,
    getMessagePreview,

    contacts,
    forwardMsg,
    forwardPreview,
    showForwardModal,

    handlers: {
      handleSend,
      handleFileUpload,
      handleSendVoice,
      handleSendSticker,
      handleSendGif,
      handleSendRichText,

      handleChatSelect,
      loadHistory,

      startReply,
      startForward,
      closeForward,
      handleConfirmForward,

      handleSendPoll,
      handleSendPollVote,
    },
  };
}
