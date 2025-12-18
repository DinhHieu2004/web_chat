import { useState, useEffect, useRef } from "react";
import { chatSocketServer } from "../services/socket";
import { uploadFileToS3 } from "../services/fileUploader";
import {
    makeOutgoingPayload,
    makeChatKeyFromActive,
    formatVNDateTime,
    makeChatKeyFromWs,
} from "../utils/chatDataFormatter";
import {setListUser} from "../redux/slices/listUserSlice.js";
import {useDispatch} from "react-redux";


const tryParseCustomPayload = (text) => {
    if (!text || typeof text !== "string") return null;
    if (text.length < 15 || !text.startsWith("{")) return null;

    try {
        const parsed = JSON.parse(text);
        if (parsed?.customType && parsed?.url) {
            return {
                type: parsed.customType,
                url: parsed.url,
                text: parsed.text || "",
                fileName: parsed.fileName || null,
            };
        }
    } catch (_) { }

    return null;
};

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

            if (from === currentUser) {
                return;
            }

            const fileData = tryParseCustomPayload(mes);

            const finalType = fileData?.type || "text";
            const finalUrl = fileData?.url || null;
            const finalText = fileData ? fileData.text : mes;
            const finalFileName = fileData?.fileName || null;

            setMessagesMap((prev) => ({
                ...prev,
                [incomingKey]: [
                    ...(prev[incomingKey] || []),
                    {
                        id: Date.now() + Math.random(),
                        text: finalText,
                        sender: "other",
                        time: formatVNDateTime(),
                        type: finalType,
                        from,
                        url: finalUrl,
                        fileName: finalFileName,
                    },
                ],
            }));
        };

        const onHistory = (payload) => {
            const { status, event, data } = payload || {};
            if (status !== "success") return;

            const mapHistoryMessage = (m) => {
                const fileData = tryParseCustomPayload(m.mes);

                return {
                    id: m.id ?? Date.now() + Math.random(),
                    text: fileData ? fileData.text : m.mes || "",
                    sender: m.name === currentUser ? "user" : "other",
                    time: formatVNDateTime(m.createAt),
                    type: fileData?.type || m.messageType || "text",
                    from: m.name,
                    to: m.to,
                    url: fileData?.url || m.url || null,
                    fileName: fileData?.fileName || null,
                };
            };

            if (event === "GET_PEOPLE_CHAT_MES" && Array.isArray(data)) {
                const otherUser =
                    data[0]?.name === currentUser ? data[0]?.to : data[0]?.name;
                if (!otherUser) return;

                setMessagesMap((prev) => ({
                    ...prev,
                    [`user:${otherUser}`]: data
                        .slice()
                        .reverse()
                        .map(mapHistoryMessage),
                }));
            }

            if (
                event === "GET_ROOM_CHAT_MES" &&
                Array.isArray(data?.chatData)
            ) {
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

    /**
     * =================================================
     * SEND TEXT
     * =================================================
     */
    const handleSend = () => {
        if (!activeChat) return;

        const text = input.trim();
        if (!text) return;

        const payload = makeOutgoingPayload({
            type: activeChat.type,
            to: activeChat.name,
            mes: text,
        });

        chatSocketServer.send("SEND_CHAT", payload);

        setMessagesMap((prev) => ({
            ...prev,
            [chatKey]: [
                ...(prev[chatKey] || []),
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
        }));
        dispatch(setListUser({
            name: activeChat.name,
            lastMessage: text,
            actionTime: Date.now(),
            type: activeChat.type,
        }));
        setInput("");
    };

    /**
     * =================================================
     * FILE / VOICE UPLOAD
     * =================================================
     */
    const handleFileUpload = async (file) => {
        if (!activeChat || !file) return;

        setIsUploading(true);

        try {
            const url = await uploadFileToS3(file);
            if (!url) return;

            const ext = file.name.split(".").pop().toLowerCase();
            const type = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
                ? "image"
                : ["mp4", "webm"].includes(ext)
                    ? "video"
                    : ["mp3", "wav", "ogg", "webm"].includes(ext)
                        ? "audio"
                        : "file";

            const captionText = input.trim(); 

            const payloadText = JSON.stringify({
            customType: type,
            url,
            text: captionText,
            fileName: file.name,
            });

          
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
            dispatch(setListUser({
                name: activeChat.name,
                lastMessage: type,
                actionTime: Date.now(),
                type: activeChat.type,
            }));

        } finally {
            setIsUploading(false);
        }
    };

    /**
     * =================================================
     * LOAD HISTORY & UI HELPERS
     * =================================================
     */
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
        },
    };
}
