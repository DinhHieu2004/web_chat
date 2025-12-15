import { useState, useEffect, useRef } from "react";
import { chatSocketServer } from "../services/socket";
import { uploadFileToS3 } from "../services/fileUploader";
import {
  makeOutgoingPayload,
  makeChatKeyFromActive,
  formatVNDateTime,
  makeChatKeyFromWs,
} from "../utils/chatDataFormatter";

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
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const chatKey = makeChatKeyFromActive(activeChat);
  const messages = chatKey ? messagesMap[chatKey] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onIncoming = (payload) => {
      const d = payload?.data?.data || payload?.data || payload || {};
      const { type, to, mes, url, messageType } = d;
      const from = d.from ?? d.name;

      if (!mes && !url) return;

      const incomingKey = makeChatKeyFromWs({ type, from, to, currentUser });
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
              text: mes || "",
              sender: "other",
              time: formatVNDateTime(),
              type: messageType || "text",
              from,
              url: url || null,
            },
          ],
        };
      });
    };

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
            type: m.messageType || "text",
            from: m.name,
            to: m.to,
            url: m.url || null,
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
            type: m.messageType || "text",
            from: m.name,
            to: m.to,
            url: m.url || null,
          }));

        setMessagesMap((prev) => ({
          ...prev,
          [key]: mapped,
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

  const handleSend = () => {
    if (!activeChat) return;

    const text = input.trim();
    if (!text) return;

    const payload = makeOutgoingPayload({
      type: activeChat.type,
      to: activeChat.name,
      mes: text,
    });

    if (!payload) return;

    chatSocketServer.send("SEND_CHAT", payload);

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
            time: formatVNDateTime(),
            type: "text",
            from: currentUser,
            to: activeChat.name,
            optimistic: true,
          },
        ],
      };
    });

    setInput("");
  };

  const getFileTypeByExtension = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff'];
    if (imageExts.includes(ext)) return 'image';
    
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'mpeg', 'mpg', '3gp'];
    if (videoExts.includes(ext)) return 'video';
    
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus'];
    if (audioExts.includes(ext)) return 'audio';
    
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt'];
    if (docExts.includes(ext)) return 'document';
    
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];
    if (archiveExts.includes(ext)) return 'archive';
    
    return 'file';
  };

  const handleFileUpload = async (file) => {
    if (!activeChat || !file) return;

    setIsUploading(true);

    try {
      const url = await uploadFileToS3(file);
      
      if (!url) {
        console.error("Không thể upload file");
        setIsUploading(false);
        return;
      }

      const messageType = getFileTypeByExtension(file.name);

      const payload = makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: file.name,
        url: url,
        messageType: messageType,
      });

      if (!payload) {
        setIsUploading(false);
        return;
      }

      chatSocketServer.send("SEND_CHAT", payload);

      const key = chatKey;
      if (!key) {
        setIsUploading(false);
        return;
      }

      setMessagesMap((prev) => {
        const prevMsgs = prev[key] || [];
        return {
          ...prev,
          [key]: [
            ...prevMsgs,
            {
              id: `local-${Date.now()}`,
              text: file.name,
              sender: "user",
              time: formatVNDateTime(),
              type: messageType,
              from: currentUser,
              to: activeChat.name,
              url: url,
              optimistic: true,
            },
          ],
        };
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVoiceMessage = async (audioBlob) => {
    if (!activeChat || !audioBlob) return;

    setIsUploading(true);

    try {
      const audioFile = new File(
        [audioBlob],
        `voice-${Date.now()}.webm`,
        { type: "audio/webm" }
      );

      const url = await uploadFileToS3(audioFile);
      
      if (!url) {
        console.error("Không thể upload voice message");
        setIsUploading(false);
        return;
      }

      const payload = makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: "Voice message",
        url: url,
        messageType: "audio",
      });

      if (!payload) {
        setIsUploading(false);
        return;
      }

      chatSocketServer.send("SEND_CHAT", payload);

      const key = chatKey;
      if (!key) {
        setIsUploading(false);
        return;
      }

      setMessagesMap((prev) => {
        const prevMsgs = prev[key] || [];
        return {
          ...prev,
          [key]: [
            ...prevMsgs,
            {
              id: `local-${Date.now()}`,
              text: "Voice message",
              sender: "user",
              time: formatVNDateTime(),
              type: "audio",
              from: currentUser,
              to: activeChat.name,
              url: url,
              optimistic: true,
            },
          ],
        };
      });
    } catch (error) {
      console.error("Error sending voice message:", error);
    } finally {
      setIsUploading(false);
    }
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
    isUploading,

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