import { useState, useEffect, useRef } from "react";
import { chatSocketServer } from "../services/socket";

export default function useChatLogic({
  activeChat,
  setActiveChat,
  currentUser,
}) {
  const [messagesMap, setMessagesMap] = useState({});

  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const makeChatKeyFromActive = (chat) => {
    if (!chat) return null;
    if (chat.type === "room") return `group:${chat.name}`;
    if (chat.type === "people") return `user:${chat.name}`;
    return null;
  };

  const formatVNDateTime = (isoLike) => {
    const d = isoLike ? new Date(isoLike) : new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const DD = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const YYYY = d.getFullYear();
    return `${hh}:${mm} ${DD}-${MM}-${YYYY}`;
  };

  const makeChatKeyFromWs = ({ type, from, to }) => {
    const isRoom = type === "room" || type === 1;

    if (isRoom) return to ? `group:${to}` : null;

    const other = from === currentUser ? to : from;
    return other ? `user:${other}` : null;
  };

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

      const incomingKey = makeChatKeyFromWs({ type, from, to });

      if (!incomingKey) return;

      setMessagesMap((prev) => {
        const prevMsgs = prev[incomingKey] || [];
        if (from === currentUser) return prev;
        return {
          ...prev,
          [incomingKey]: [
            ...prevMsgs,
            {
              id: Date.now() + Math.random(),
              text: mes,
              sender: "other",
              time: formatVNDateTime(),
              type: "text",
              from,
            },
          ],
        };
      });
    };

    chatSocketServer.on("SEND_CHAT", onIncoming);
    const onHistory = (payload) => {
      const status = payload?.status;
      const event = payload?.event;
      const data = payload?.data;

      if (status !== "success") return;

      if (event === "GET_PEOPLE_CHAT_MES" && Array.isArray(data)) {
        const otherUser = data[0]
          ? data[0].name === currentUser
            ? data[0].to
            : data[0].name
          : null;

        const key = otherUser ? `user:${otherUser}` : null;
        if (!key) return;

        const mapped = data
          .slice()
          .reverse()
          .map((m) => ({
            id: m.id ?? Date.now() + Math.random(),
            text: m.mes ?? "",
            sender: m.name === currentUser ? "user" : "other",
            time: formatVNDateTime(m.createAt),
            type: "text",
            from: m.name,
            to: m.to,
          }));

        setMessagesMap((prev) => ({
          ...prev,
          [key]: mapped,
        }));

        return;
      }

      if (
        event === "GET_ROOM_CHAT_MES" &&
        data?.chatData &&
        Array.isArray(data.chatData)
      ) {
        const roomName = data.name;
        const key = roomName ? `group:${roomName}` : null;
        if (!key) return;

        const mapped = data.chatData
          .slice()
          .reverse()
          .map((m) => ({
            id: m.id ?? Date.now() + Math.random(),
            text: m.mes ?? "",
            sender: m.name === currentUser ? "user" : "other",
            time: formatVNDateTime(m.createAt),
            type: "text",
            from: m.name,
            to: m.to,
          }));

        setMessagesMap((prev) => ({
          ...prev,
          [key]: mapped,
        }));
      }
    };

    chatSocketServer.on("GET_ROOM_CHAT_MES", onHistory);
    chatSocketServer.on("GET_PEOPLE_CHAT_MES", onHistory);

    return () => {
      chatSocketServer.off("SEND_CHAT", onIncoming);
      chatSocketServer.off("GET_ROOM_CHAT_MES", onHistory);
      chatSocketServer.off("GET_PEOPLE_CHAT_MES", onHistory);
    };
  }, [currentUser]);

  const handleSend = () => {
    if (!activeChat) return;

    const text = input.trim();
    if (!text) return;

    let wsType;
    if (activeChat.type === "room") {
      wsType = "room";
    } else if (activeChat.type === "people") {
      wsType = "people";
    } else {
      console.warn("Unknown chat type:", activeChat.type);
      return;
    }

    const to = activeChat.name;
    const now = formatVNDateTime();

    chatSocketServer.send("SEND_CHAT", {
      type: wsType,
      to,
      mes: text,
    });

    const key = chatKey;
    if (!key) return;

    setMessagesMap((prev) => {
      const prevMsgs = prev[key] || [];

      return {
        ...prev,
        [key]: [
          ...prevMsgs,
          {
            id: `local-${Date.now()}`, 
            text,
            sender: "user",
            time: now,
            type: "text",
            from: currentUser, 
            to,
            optimistic: true, 
          },
        ],
      };
    });

    setInput("");
  };

  const loadHistory = (page = 1, chat = activeChat) => {
    if (!chat) return;

    if (chat.type === "room") {
      chatSocketServer.send("GET_ROOM_CHAT_MES", {
        name: chat.name,
        page,
      });
    } else if (chat.type === "people") {
      chatSocketServer.send("GET_PEOPLE_CHAT_MES", {
        name: chat.name,
        page,
      });
    }
  };

  const handleChatSelect = (contact) => {
    setActiveChat(contact);

    loadHistory(1, contact);

    setShowEmojiPicker(false);
    setShowStickerPicker(false);
    setShowGroupMenu(false);
  };

  const handleFileUpload = () => {};
  const handleVoiceMessage = () => {};

  const toggleEmojiPicker = () => setShowEmojiPicker((v) => !v);
  const toggleStickerPicker = () => setShowStickerPicker((v) => !v);
  const toggleGroupMenu = () => setShowGroupMenu((v) => !v);

  return {
    activeChat,
    messages,
    input,
    setInput,
    searchTerm,
    setSearchTerm,
    messagesEndRef,

    showEmojiPicker,
    showStickerPicker,
    showGroupMenu,

    toggleEmojiPicker,
    toggleStickerPicker,
    toggleGroupMenu,

    handlers: {
      handleSend,
      handleChatSelect,
      loadHistory,
      handleFileUpload,
      handleVoiceMessage,
    },
  };
}
