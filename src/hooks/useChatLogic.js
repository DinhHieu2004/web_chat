import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { chatSocketServer } from "../services/socket";
import { uploadFileToS3 } from "../services/fileUploader";
import {
    tryParseCustomPayload,
    parseCustomMessage,
    buildEmojiMessage,
    makeOutgoingPayload,
    makeChatKeyFromActive,
    formatVNDateTime,
    makeChatKeyFromWs,
    hasEmoji,
} from "../utils/chatDataFormatter";

import {
    addMessage,
    initChat,
    setHistory,
} from "../redux/slices/chatSlice";
import { selectMessagesByChatKey } from "../redux/selectors/chatSelector";
import { setListUser } from "../redux/slices/listUserSlice";


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

    // ---------- DATA ----------
    const chatKey = makeChatKeyFromActive(activeChat);


    const messages = useSelector(
        chatKey ? selectMessagesByChatKey(chatKey) : () => []
    );


    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const onIncoming = (payload) => {
            const d = payload?.data?.data || payload?.data || payload || {};
            const { type, to, mes } = d;
            const from = d.from ?? d.name;
            if (!mes || from === currentUser) return;

            const incomingKey = makeChatKeyFromWs({
                type,
                from,
                to,
                currentUser,
            });
            if (!incomingKey) return;

            dispatch(initChat(incomingKey));

            const parsed = tryParseCustomPayload(mes);

            dispatch(
                addMessage({
                    chatKey: incomingKey,
                    message: {
                        id: Date.now() + Math.random(),
                        text: parsed ? parsed.text : m.mes || "",
                        sender: "other",
                        time: formatVNDateTime(),
                        type: parsed?.type || "text",
                        from,
                        to,
                        url: parsed?.url || null,
                        fileName: parsed?.fileName || null,
                    },
                })
            );
        };

        const onHistory = (payload) => {
            const { status, event, data } = payload || {};
            if (status !== "success") return;

            const mapHistoryMessage = (m) => {
                const parsed = tryParseCustomPayload(m.mes);
                return {
                    id: m.id ?? Date.now() + Math.random(),
                    text: parsed ? parsed.text : m.mes || "",
                    sender: m.name === currentUser ? "user" : "other",
                    time: formatVNDateTime(m.createAt),
                    type: parsed?.type || m.messageType || "text",
                    from: m.name,
                    to: m.to,
                    url: parsed?.url || m.url || null,
                    fileName: parsed?.fileName || null,
                };
            };

            if (event === "GET_PEOPLE_CHAT_MES" && Array.isArray(data)) {
                const otherUser =
                    data[0]?.name === currentUser ? data[0]?.to : data[0]?.name;

                dispatch(
                    setHistory({
                        chatKey: `user:${otherUser}`,
                        messages: data.slice().reverse().map(mapHistoryMessage),
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
                            .map(mapHistoryMessage),
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


    const handleSend = () => {
        if (!activeChat) return;

        const text = input.trim();
        if (!text) return;

        const mes = hasEmoji(text) ? buildEmojiMessage(text) : text;

        chatSocketServer.send(
            "SEND_CHAT",
            makeOutgoingPayload({
                type: activeChat.type,
                to: activeChat.name,
                mes,
            })
        );

        dispatch(
            addMessage({
                chatKey,
                message: {
                    id: `local-${Date.now()}`,
                    text,
                    sender: "user",
                    time: formatVNDateTime(),
                    type: hasEmoji(text) ? "emoji" : "text",
                    from: currentUser,
                    to: activeChat.name,
                    optimistic: true,
                },
            })
        );

        dispatch(
            setListUser({
                name: activeChat.name,
                lastMessage: text,
                actionTime: Date.now(),
                type: activeChat.type,
            })
        );

        setInput("");
    };

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

            dispatch(
                addMessage({
                    chatKey,
                    message: {
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
                })
            );
        } finally {
            setIsUploading(false);
        }
    };

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

            const payloadText = JSON.stringify({
                customType: "audio",
                url,
                fileName,
            });

            chatSocketServer.send(
                "SEND_CHAT",
                makeOutgoingPayload({
                    type: activeChat.type,
                    to: activeChat.name,
                    mes: payloadText,
                })
            );

            dispatch(
                addMessage({
                    chatKey,
                    message: {
                        id: `local-${Date.now()}`,
                        sender: "user",
                        time: formatVNDateTime(),
                        type: "audio",
                        from: currentUser,
                        to: activeChat.name,
                        url,
                        fileName,
                        optimistic: true,
                    },
                })
            );
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
        });

        chatSocketServer.send(
            "SEND_CHAT",
            makeOutgoingPayload({
                type: activeChat.type,
                to: activeChat.name,
                mes: payloadText,
            })
        );

        dispatch(
            addMessage({
                chatKey,
                message: {
                    id: `local-${Date.now()}`,
                    sender: "user",
                    time: formatVNDateTime(),
                    type: "sticker",
                    from: currentUser,
                    to: activeChat.name,
                    url: sticker.url,
                    optimistic: true,
                },
            })
        );
    };

    const handleSendGif = (gif) => {
        if (!activeChat || !gif?.url) return;

        const payloadText = JSON.stringify({
            customType: "gif",
            gifId: gif.id,
            url: gif.url,
        });

        chatSocketServer.send(
            "SEND_CHAT",
            makeOutgoingPayload({
                type: activeChat.type,
                to: activeChat.name,
                mes: payloadText,
            })
        );

        dispatch(
            addMessage({
                chatKey,
                message: {
                    id: `local-${Date.now()}`,
                    sender: "user",
                    time: formatVNDateTime(),
                    type: "gif",
                    from: currentUser,
                    to: activeChat.name,
                    url: gif.url,
                    optimistic: true,
                },
            })
        );
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
            handleFileUpload,
            handleSendVoice,
            handleSendSticker,
            handleSendGif,
            handleChatSelect,
            loadHistory,
        },
    };
}
