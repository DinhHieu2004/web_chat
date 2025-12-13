import { useState, useEffect, useRef } from "react";
import { chatSocketServer } from "../services/socket";

export default function useChatLogic({
  activeChat,
  setActiveChat,
  initialContacts,
  currentUser,
}) {
  const [messagesMap, setMessagesMap] = useState({});

  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const makeChatKeyFromActive = (chat) =>
    chat ? `${chat.type}:${chat.name}` : null;

  const makeChatKeyFromWs = ({ type, from, to }) => {
    if (type === "room") return `group:${to}`;

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
      const d = payload?.data?.data || payload?.data || {};
      const { type, from, to, mes } = d;

      if (!mes) return;

      const incomingKey = makeChatKeyFromWs({ type, from, to });

      if (!incomingKey) return;

      setMessagesMap((prev) => {
        const prevMsgs = prev[incomingKey] || [];
        return {
          ...prev,
          [incomingKey]: [
            ...prevMsgs,
            {
              id: Date.now() + Math.random(),
              text: mes,
              sender: from === currentUser ? "user" : "other",
              time: new Date().toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              type: "text",
              from,
            },
          ],
        };
      });
    };

    chatSocketServer.on("SEND_CHAT", onIncoming);
    return () => chatSocketServer.off("SEND_CHAT", onIncoming);
  }, [currentUser]);

  const handleSend = () => {
    if (!activeChat) return;

    const text = input.trim();
    if (!text) return;

    let wsType;

    if (activeChat.type === "group") {
      wsType = "room";
    } else if (activeChat.type === "user") {
      wsType = "people";
    } else {
      console.warn("Unknown chat type:", activeChat.type);
      return;
    }

    const to = activeChat.name;

    chatSocketServer.send("SEND_CHAT", {
      type: wsType,
      to,
      mes: text,
    });

    const key = makeChatKeyFromActive(activeChat);
    if (!key) return;

    setMessagesMap((prev) => {
      const prevMsgs = prev[key] || [];
      return {
        ...prev,
        [key]: [
          ...prevMsgs,
          {
            id: Date.now() + Math.random(),
            text,
            sender: "user",
            time: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            type: "text",
          },
        ],
      };
    });

    setInput("");
  };

  const handleChatSelect = (contact) => {
    const normalized =
      contact.type === "room"
        ? { ...contact, type: "group" }
        : contact.type === "people"
        ? { ...contact, type: "user" }
        : contact;

    setActiveChat(normalized);
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
      handleFileUpload,
      handleVoiceMessage,
    },
  };
}
