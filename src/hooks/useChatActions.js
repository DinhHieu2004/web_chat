import { chatSocketServer } from "../services/socket";
import { uploadFileToS3 } from "../services/fileUploader";
import { usePollActions } from "./handleSendPoll";

import {
    addMessage,
    removeMessage,
    recallMessage,
    insertMessageAt,
    toggleReaction,
} from "../redux/slices/chatSlice";

import { setListUser } from "../redux/slices/listUserSlice";

import {
    getMsgKey,
    addLocalDeleted,
    addLocalRecalled,
    removeLocalDeleted,
} from "../utils/localMessageActions";

import {
    makeOutgoingPayload,
    formatVNDateTime,
    hasEmoji,
    buildEmojiMessage,
    getMessagePreview,
    tryParseCustomPayload,
    buildForwardMessage,
    extractRichText,
} from "../utils/chatDataFormatter";

export function useChatActions({
    activeChat,
    chatKey,
    currentUser,
    dispatch,
    replyMsg,
    setReplyMsg,
    setInput,
    setIsUploading,
    forwardMsg,
    setForwardMsg,
    setShowForwardModal,
    setForwardPreview,
}) {
    const pollActions = usePollActions({ activeChat, chatKey, currentUser });

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
        if (typeof mes === "string" && !mes.startsWith("{")) {
            return JSON.stringify({ customType: "text", text: mes, meta });
        }
        try {
            return JSON.stringify({ ...JSON.parse(mes), meta });
        } catch {
            return mes;
        }
    };

    const handleToggleReaction = (message, unified) => {
        if (!message?.id || !unified || !activeChat || !currentUser) return;

        const messageChatKey = message.chatKey || chatKey;

        const userKey =
            typeof currentUser === "string"
                ? currentUser.startsWith("user:")
                    ? currentUser
                    : `user:${currentUser}`
                : `user:${currentUser.id}`;

        dispatch(
            toggleReaction({
                chatKey: messageChatKey,
                messageId: message.id,
                emoji: unified,
                user: userKey,
            })
        );

        chatSocketServer.send(
            "SEND_CHAT",
            makeOutgoingPayload({
                type: activeChat.type,
                to: activeChat.name,
                mes: JSON.stringify({
                    customType: "reaction",
                    messageId: message.id,
                    emoji: unified,
                    user: userKey,
                }),
            })
        );
    };

    const commonEmit = (payload, localData) => {
        chatSocketServer.send(
            "SEND_CHAT",
            makeOutgoingPayload({
                type: activeChat.type,
                to: activeChat.name,
                mes: payload,
            })
        );

        const now = Date.now();

        dispatch(
            addMessage({
                chatKey,
                message: {
                    ...localData,
                    chatKey,
                    id: `local-${now}`,
                    actionTime: now,
                    time: formatVNDateTime(now),
                    from: currentUser,
                    to: activeChat.name,
                    sender: "user",
                    optimistic: true,
                    meta: replyMsg
                        ? { reply: { preview: getMessagePreview(replyMsg) } }
                        : null,
                },
            })
        );

        dispatch(
            setListUser({
                name: activeChat.name,
                lastMessage: localData.text || `[${localData.type.toUpperCase()}]`,
                actionTime: now,
                type: activeChat.type,
            })
        );

        setReplyMsg(null);
        setInput("");
    };

    const handleDeleteForMe = (msg) => {
        if (!msg?.id) return;

        const msgKey = getMsgKey(msg);
        addLocalDeleted(chatKey, msgKey);

        dispatch(removeMessage({ chatKey, id: msg.id }));
    };

    const handleRecallLocal = (msg) => {
        if (!msg?.id) return;

        const isMe = msg.sender === "user" || msg.from === currentUser;
        if (!isMe) return;

        const msgKey = getMsgKey(msg);
        addLocalRecalled(chatKey, msgKey);

        dispatch(recallMessage({ chatKey, id: msg.id }));
    };

    const handleUndoDeleteForMe = (targetChatKey, msg, restoreIndex) => {
        if (!msg?.id || !targetChatKey) return;

        const msgKey = getMsgKey(msg);
        removeLocalDeleted(targetChatKey, msgKey);

        dispatch(
            insertMessageAt({
                chatKey: targetChatKey,
                index: typeof restoreIndex === "number" ? restoreIndex : 0,
                message: msg,
            })
        );
    };

    return {
        handleSend: (textValue) => {
            const text = (textValue || "").trim();
            if (!text || !activeChat) return;
            const mes = attachReplyMeta(
                hasEmoji(text) ? buildEmojiMessage(text) : text
            );
            commonEmit(mes, { text, type: hasEmoji(text) ? "emoji" : "text" });
        },

        handleFileUpload: async (file, currentInput) => {
            if (!activeChat || !file) return;
            setIsUploading(true);
            try {
                const url = await uploadFileToS3(file);
                if (!url) return;
                const ext = file.name.split(".").pop().toLowerCase();
                let type = "file";
                if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) type = "image";
                else if (["mp4", "webm"].includes(ext)) type = "video";
                else if (["mp3", "wav", "ogg", "webm"].includes(ext)) type = "audio";

                const payload = attachReplyMeta(
                    JSON.stringify({
                        customType: type,
                        url,
                        text: currentInput,
                        fileName: file.name,
                    })
                );
                commonEmit(payload, {
                    text: currentInput,
                    type,
                    url,
                    fileName: file.name,
                });
            } finally {
                setIsUploading(false);
            }
        },

        handleSendVoice: async (audioBlob) => {
            if (!activeChat || !audioBlob) return;
            setIsUploading(true);
            try {
                const fileName = `voice-${Date.now()}.webm`;
                const audioFile = new File([audioBlob], fileName, {
                    type: "audio/webm",
                });
                const url = await uploadFileToS3(audioFile);
                if (!url) return;

                const payload = attachReplyMeta(
                    JSON.stringify({ customType: "audio", url, fileName })
                );
                commonEmit(payload, { type: "audio", url, fileName });
            } finally {
                setIsUploading(false);
            }
        },

        handleConfirmForward: ({ selectedMap, note }) => {
            if (!forwardMsg || !activeChat) return;
            const keys = Object.keys(selectedMap || {}).filter((k) => selectedMap[k]);
            const now = Date.now();

            keys.forEach((k) => {
                const [type, name] = k.split(":");
                const payloadText = buildForwardMessage({
                    originMsg: forwardMsg,
                    originChat: activeChat,
                    note,
                });
                const parsed = tryParseCustomPayload(payloadText);

                chatSocketServer.send(
                    "SEND_CHAT",
                    makeOutgoingPayload({
                        type: type === "room" ? "room" : "people",
                        to: name,
                        mes: payloadText,
                    })
                );

                const targetKey = type === "room" ? `group:${name}` : `user:${name}`;

                dispatch(
                    addMessage({
                        chatKey: targetKey,
                        message: {
                            id: `fwd-${now}-${Math.random()}`,
                            text: parsed?.text || "[Forward]",
                            sender: "user",
                            actionTime: now,
                            time: formatVNDateTime(now),
                            type: parsed?.type || "forward",
                            from: currentUser,
                            to: name,
                            optimistic: true,
                            rawMes: payloadText,

                            meta: parsed?.meta || null,
                            blocks: Array.isArray(parsed?.blocks) ? parsed.blocks : [],
                            url: parsed?.url || null,
                            fileName: parsed?.fileName || null,
                        },
                    })
                );

                dispatch(
                    setListUser({
                        name,
                        lastMessage: parsed?.text || "[Forward]",
                        actionTime: now,
                        type: type === "room" ? "room" : "people",
                    })
                );
            });
            setShowForwardModal(false);
            setForwardMsg(null);
            setForwardPreview(null);
        },

        handleSendSticker: (sticker) => {
            if (!sticker?.url) return;
            const payload = attachReplyMeta(
                JSON.stringify({ customType: "sticker", url: sticker.url })
            );
            commonEmit(payload, { type: "sticker", url: sticker.url });
        },

        handleSendGif: (gif) => {
            if (!gif?.url) return;
            const payload = attachReplyMeta(
                JSON.stringify({ customType: "gif", url: gif.url })
            );
            commonEmit(payload, { type: "gif", url: gif.url });
        },

        handleSendRichText: (editorRef) => {
            const rich = extractRichText(editorRef);
            if (!rich) return;
            const payload = attachReplyMeta(
                JSON.stringify({
                    customType: "richText",
                    text: rich.text,
                    blocks: rich.blocks,
                })
            );
            commonEmit(payload, {
                type: "richText",
                text: rich.text,
                blocks: rich.blocks,
                sender: "user",
            });
        },

        handleDeleteForMe,
        handleRecallLocal,
        handleUndoDeleteForMe,
        handleToggleReaction,
        handleSendPoll: pollActions.handleSendPoll,
        handleSendPollVote: pollActions.handleSendPollVote,
        handleRemovePollVote: pollActions.handleRemovePollVote,
    };
}
