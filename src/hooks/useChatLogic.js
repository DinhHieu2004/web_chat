import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { chatSocketServer } from "../services/socket";
import { uploadFileToS3 } from "../services/fileUploader";
import { usePollActions } from "./handleSendPoll";
//import { useTypingLogic } from "./useTypingLogic";
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
} from "../utils/chatDataFormatter";

import { addMessage, setHistory } from "../redux/slices/chatSlice";
import { selectMessagesByChatKey } from "../redux/selectors/chatSelector";
import { setListUser } from "../redux/slices/listUserSlice";

import {
    buildSenderOptions,
    filterBySender,
    filterByDate,
} from "../utils/chatSearchUtils";


export default function useChatLogic({ activeChat, setActiveChat, currentUser,
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

    //Typing 
    //const { typing, handleIncomingTyping , stopTyping } = useTypingLogic({ activeChat, userName: currentUser, input })

    // search query + filters
    const norm = (s = "") => String(s).toLowerCase().trim();
    const [messageSearchQuery, setMessageSearchQuery] = useState("");
    const [senderFilter, setSenderFilter] = useState("ALL");
    const [dateFilter, setDateFilter] = useState("ALL");

    // match index + refs (scroll to message)
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

    const senderOptions = useMemo(() => {
        return buildSenderOptions(messages || []);
    }, [messages]);

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
        const next = (activeMatchIndex + 1) % matchIds.length;
        scrollToMatchIndex(next);
    };

    const gotoPrevMatch = () => {
        if (!matchIds.length) return;
        const prev = (activeMatchIndex - 1 + matchIds.length) % matchIds.length;
        scrollToMatchIndex(prev);
    };

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const onIncoming = (data) => {
            const d = data?.data?.data || data?.data || data || {};
            const from = d?.name || d?.from || d?.fromUser || null;
            const to = d?.to || null;
            const type = d?.type;
            const rawMes = d?.mes ?? d?.message ?? d?.mes ?? null;

            const parsed = tryParseCustomPayload(
                typeof rawMes === "string" ? rawMes : rawMes?.mes
            );

            if (parsed?.customType === "typing") {
                if (handleIncomingTyping) handleIncomingTyping(parsed, from);
                return;
            }

            const incomingKey = makeChatKeyFromWs({ type, from, to, currentUser });
            if (!incomingKey) {
                console.warn("Unable to compute chatKey for incoming message:", data);
                return;
            }

            const now = Date.now();
            const rawText =
                typeof rawMes === "string" ? rawMes : rawMes?.mes ?? rawMes?.text ?? "";

            dispatch(
                addMessage({
                    chatKey: incomingKey,
                    message: {
                        id: now + Math.random(),
                        text: parsed ? parsed.text : rawText || "",
                        sender: "other",
                        actionTime: now,
                        time: formatVNDateTime(now),
                        type: parsed?.type || "text",
                        from,
                        to,
                        url: parsed?.url || null,
                        fileName: parsed?.fileName || null,
                        meta: parsed?.meta || null,
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
            } catch (e) {
            }
        };

        const onHistory = (payload) => {
            const { status, event, data } = payload || {};
            if (status !== "success") return;

            const mapHistoryMessage = (m) => {
                const parsed = tryParseCustomPayload(m?.mes);

                if (parsed?.customType === 'typing') return null;

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
                    url: parsed?.url || m?.url || null,
                    fileName: parsed?.fileName || null,
                    meta: parsed?.meta || null,
                };
            };

            if (event === "GET_PEOPLE_CHAT_MES" && Array.isArray(data)) {
                const otherUser =
                    data[0]?.name === currentUser ? data[0]?.to : data[0]?.name;

                dispatch(
                    setHistory({
                        chatKey: `user:${otherUser}`,
                        messages: data.slice().reverse().map(mapHistoryMessage).filter(Boolean),
                    })
                );
            }

            if (event === "GET_ROOM_CHAT_MES" && Array.isArray(data?.chatData)) {
                dispatch(
                    setHistory({
                        chatKey: `group:${data.name}`,
                        messages: data.chatData.slice().reverse().map(mapHistoryMessage).filter(Boolean),
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
    }, [currentUser, dispatch, activeChat]);
    const startReply = (msg) => {
        setReplyMsg(msg);
    };
    const attachReplyMeta = (mes) => {
        if (!replyMsg) return mes;

        const replyMeta = {
            reply: {
                msgId: replyMsg.id,
                from: replyMsg.from,
                type: replyMsg.type,
                preview: getMessagePreview(replyMsg),
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

    const handleFileUpload = async (file) => {
        if (!activeChat || !file) return;
        const captionText = input.trim();

        setIsUploading(true);

        try {
            // stopTyping();
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
                        meta: buildReplyMeta?.() || null,
                    },
                })
            );
            dispatch(
                setListUser({
                    name: activeChat.name,
                    lastMessage: captionText,
                    actionTime: now,
                    type: activeChat.type,
                })
            );
            setReplyMsg(null);
        } finally {
            setIsUploading(false);
        }
    };
    const handleSend = () => {
        if (!activeChat) return;

        const text = input.trim();
        if (!text) return;

        //  stopTyping(); 

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
                    meta: buildReplyMeta?.() || null,
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

    const handleSendVoice = async (audioBlob) => {
        if (!activeChat || !audioBlob) return;

        setIsUploading(true);

        try {
            //  stopTyping();
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
                        meta: buildReplyMeta?.() || null,
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
                    meta: buildReplyMeta?.() || null,
                },
            })
        );

        setReplyMsg(null);
    };

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
                    meta: buildReplyMeta?.() || null,
                },
            })
        );

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
        //   typing,
        activeChat,
        messages,
        input,

        handlers: {
            handleSend,
            handleFileUpload,
            handleSendVoice,
            handleSendSticker,
            handleSendGif,
            handleChatSelect,
            loadHistory,
            startReply,
            handleSendPoll,
            handleSendPollVote,
        },
    };
}