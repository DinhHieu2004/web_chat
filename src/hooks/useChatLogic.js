import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { chatSocketServer } from "../services/socket";
import { uploadFileToS3 } from "../services/fileUploader";
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
  buildForwardMessage,
} from "../utils/chatDataFormatter";
import { usePollActions } from "./handleSendPoll";

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

  // ---------- REPLY ----------
  const [replyMsg, setReplyMsg] = useState(null);
  const clearReply = () => setReplyMsg(null);

  // ---------- SEARCH PANEL ----------
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
  const contacts = useSelector((state) => state.listUser.list || []);

  const startForward = (payload) => {
    const msg = payload?.message ?? payload;
    let pv = payload?.preview;

    if (!pv) {
      pv = getPurePreview?.(msg) || getMessagePreview?.(msg);
    }

    setForwardMsg(msg);
    setForwardPreview(pv || { type: "text", text: "" });
    setShowForwardModal(true);
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

    const parsed = tryParseCustomPayload(payloadText);
    const now = Date.now();

    Object.keys(selectedMap || {})
      .filter((k) => selectedMap[k])
      .forEach((k) => {
        const [type, name] = k.split(":");
        if (!type || !name) return;

        chatSocketServer.send(
          "SEND_CHAT",
          makeOutgoingPayload({
            type,
            to: name,
            mes: payloadText,
          })
        );

        const targetKey = type === "room" ? `group:${name}` : `user:${name}`;

        dispatch(
          addMessage({
            chatKey: targetKey,
            message: {
              id: `local-forward-${now}-${Math.random()}`,
              text: parsed?.text || "[Forward]",
              sender: "user",
              actionTime: now,
              time: formatVNDateTime(now),
              type: "forward",
              from: currentUser,
              to: name,
              rawMes: payloadText,
              meta: parsed?.meta || null,
              blocks: parsed?.blocks || [],
              optimistic: true,
            },
          })
        );

        dispatch(
          setListUser({
            name,
            lastMessage: parsed?.text || "[Forward]",
            actionTime: now,
            type,
          })
        );
      });

    closeForward();
  };

  // ---------- SEARCH ----------
  const norm = (s = "") => String(s).toLowerCase().trim();
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [senderFilter, setSenderFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const messageRefs = useRef({});

  const matchedMessages = useMemo(() => {
    const q = norm(messageSearchQuery);
    if (!q) return [];
    return messages.filter((m) => norm(m?.text || "").includes(q));
  }, [messages, messageSearchQuery]);

  const matchIds = useMemo(
    () => matchedMessages.map((m) => m.id),
    [matchedMessages]
  );

  const senderOptions = useMemo(
    () => buildSenderOptions(messages),
    [messages]
  );

  const filteredResults = useMemo(
    () =>
      matchedMessages.filter(
        (m) => filterBySender(m, senderFilter) && filterByDate(m, dateFilter)
      ),
    [matchedMessages, senderFilter, dateFilter]
  );

  const scrollToMatchById = (id) => {
    const el = messageRefs.current[id];
    el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  };

  const gotoNextMatch = () => {
    if (!matchIds.length) return;
    const i = (activeMatchIndex + 1) % matchIds.length;
    setActiveMatchIndex(i);
    scrollToMatchById(matchIds[i]);
  };

  const gotoPrevMatch = () => {
    if (!matchIds.length) return;
    const i = (activeMatchIndex - 1 + matchIds.length) % matchIds.length;
    setActiveMatchIndex(i);
    scrollToMatchById(matchIds[i]);
  };

  // ---------- SCROLL ----------
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- SOCKET ----------
  useEffect(() => {
    if (!currentUser) return;

    const onIncoming = (payload) => {
      const d = payload?.data?.data || payload?.data || payload || {};
      const { name, from: fromRaw, to, mes, type } = d;
      const from = fromRaw || name;

      const parsed = tryParseCustomPayload(mes);
      const chatKeyIncoming = makeChatKeyFromWs({
        type,
        from,
        to,
        currentUser,
      });

      if (!chatKeyIncoming) return;

      const now = Date.now();

      dispatch(
        addMessage({
          chatKey: chatKeyIncoming,
          message: {
            id: now + Math.random(),
            text: parsed?.text || "",
            sender: from === currentUser ? "user" : "other",
            actionTime: now,
            time: formatVNDateTime(now),
            type: parsed?.type || "text",
            from,
            to,
            rawMes: mes,
            url: parsed?.url || null,
            fileName: parsed?.fileName || null,
            meta: parsed?.meta || null,
            blocks: parsed?.blocks || [],
          },
        })
      );

      dispatch(
        setListUser({
          name: chatKeyIncoming.split(":")[1],
          lastMessage: parsed?.text || "",
          actionTime: now,
          type: type === "room" ? "room" : "people",
        })
      );
    };

    chatSocketServer.on("SEND_CHAT", onIncoming);
    return () => chatSocketServer.off("SEND_CHAT", onIncoming);
  }, [currentUser, dispatch]);

  const attachReplyMeta = (mes) => {
    if (!replyMsg) return mes;

    const meta = {
      reply: {
        msgId: replyMsg.id,
        from: replyMsg.from,
        type: replyMsg.type,
        preview: getMessagePreview(replyMsg),
      },
    };

    try {
      const parsed = typeof mes === "string" ? JSON.parse(mes) : mes;
      return JSON.stringify({ ...parsed, meta });
    } catch {
      return JSON.stringify({ customType: "text", text: mes, meta });
    }
  };

  const handleSend = () => {
    if (!activeChat || !input.trim()) return;

    let mes = hasEmoji(input)
      ? buildEmojiMessage(input)
      : JSON.stringify({ customType: "text", text: input });

    mes = attachReplyMeta(mes);

    chatSocketServer.send(
      "SEND_CHAT",
      makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes,
      })
    );

    setInput("");
    setReplyMsg(null);
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
      handleChatSelect,
      loadHistory,

      startReply: setReplyMsg,
      startForward,
      closeForward,
      handleConfirmForward,

      handleSendPoll,
      handleSendPollVote,
    },
  };
}