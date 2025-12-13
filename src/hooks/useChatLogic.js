import { useState, useEffect, useRef } from "react";
import { chatSocketServer } from "../services/socket";

export default function useChatLogic({
  activeChat,        
  setActiveChat,
  initialContacts,
}) {
  const [messagesMap, setMessagesMap] = useState({});

  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const chatKey = activeChat
    ? `${activeChat.type}:${activeChat.name}`
    : null;

  const messages = chatKey ? messagesMap[chatKey] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onIncoming = (payload) => {
      const d = payload?.data?.data || payload?.data || {};
      const { type, from, to, mes } = d;

      if (!mes) return;

      const incomingKey =
        type === "room" ? `group:${to}` : `user:${from}`;

      if (!incomingKey) return;

      setMessagesMap((prev) => {
        const prevMsgs = prev[incomingKey] || [];
        return {
          ...prev,
          [incomingKey]: [
            ...prevMsgs,
            {
              id: Date.now(),
              text: mes,
              sender: "other",
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
  }, []);

  const handleSend = () => {
    if (!input.trim() || !activeChat) return;

    const text = input.trim();
    const wsType = activeChat.type === "group" ? "room" : "people";
    const to = activeChat.name;

    chatSocketServer.send("SEND_CHAT", {
      type: wsType,
      to,
      mes: text,
    });

    const key = `${activeChat.type}:${activeChat.name}`;

    setMessagesMap((prev) => {
      const prevMsgs = prev[key] || [];
      return {
        ...prev,
        [key]: [
          ...prevMsgs,
          {
            id: Date.now(),
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
    setActiveChat(contact);      
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
