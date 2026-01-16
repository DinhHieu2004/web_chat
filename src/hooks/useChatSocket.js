import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { chatSocketServer } from "../services/socket";
import { addMessage, setHistory, toggleReaction, updatePollVote } from "../redux/slices/chatSlice";
import { setListUser } from "../redux/slices/listUserSlice";
import {
    tryParseCustomPayload,
    makeChatKeyFromWs,
    formatVNDateTime, previewToText
} from "../utils/chatDataFormatter";

export function useChatSocket(currentUser, callLogic) {
    const dispatch = useDispatch();
    const activeChatId = useSelector((state) => state.listUser.activeChatId);

    useEffect(() => {
        if (!currentUser) return;

        const normalizeId = (v) => {
            if (typeof v === "number") {
                return Number.isFinite(v) && v > 0 ? v : null;
            }
            if (typeof v === "string") {
                const s = v.trim();
                if (!s || s === "0") return null;
                return s;
            }
            return null;
        };

        const resolveMessageId = (obj, fallback) => {
            const candidates = [
                obj?.id,
                obj?.messageId,
                obj?.msgId,
                obj?._id,
                obj?.mesId,
                obj?.message_id,
            ];
            for (const c of candidates) {
                const ok = normalizeId(c);
                if (ok !== null) return ok;
            }
            return fallback;
        };

        const resolveActionTime = (obj) => {
            if (typeof obj?.actionTime === "number" && obj.actionTime) return obj.actionTime;

            const ts = obj?.createAt ? Date.parse(obj.createAt) : NaN;
            if (!Number.isNaN(ts) && ts) return ts;

            return Date.now();
        };

        const onIncoming = (payload) => {

            const d = payload?.data?.data || payload?.data || payload || {};
            const { from: fromRaw, name, to, mes, type: messageType } = d;
            const from = fromRaw || name;

            const rawText = typeof mes === "string" ? mes : mes?.mes || mes?.text || "";
            const parsed = tryParseCustomPayload(rawText);

            const chatKey = makeChatKeyFromWs({
                type: d.type === "ROOM_CHAT" || messageType === 1 ? "room" : "people",
                from,
                to, name,
                currentUser,
            });


            if (parsed?.customType === "poll_vote") {

                const pollId = parsed.pollId || parsed.poll?.id || parsed.id;
                const optionId = parsed.optionId || parsed.poll?.optionId;
                const voteAction = parsed.action || "add";
                const voteUserId = parsed.userId || from;

                let voteChatKey = chatKey;
                if (d.type === "ROOM_CHAT" || messageType === 1) {
                    voteChatKey = `group:${to}`;
                }


                if (voteChatKey && pollId && optionId) {
                    dispatch(
                        updatePollVote({
                            chatKey: voteChatKey,
                            pollId,
                            optionId,
                            userId: voteUserId,
                            action: voteAction,
                        })
                    );
                } else {
                    console.error("Thiếu thông tin vote:", { voteChatKey, pollId, optionId });
                }
                return;
            }

            if (parsed?.customType === "reaction") {
                const { messageId, emoji, user } = parsed;
                if (chatKey && messageId && emoji && user) {
                    dispatch(toggleReaction({ chatKey, messageId, emoji, user }));
                }
                return;
            }

            const isCallLog = parsed?.customType === "call_log" || parsed?.type === "call_log";

            if (parsed?.customType === "call_request") {
                if (from !== currentUser) callLogic.handleIncomingCall({ ...parsed, from });
                return;
            }
            if (parsed?.customType === "call_accepted" || parsed?.customType === "call_rejected") {
                if (parsed?.customType === "call_accepted") callLogic.notifyPeerRinging(false);
                return;
            }
            if (parsed?.customType === "call_signal") {
                if (parsed.action === "accepted") callLogic.notifyPeerRinging(false);
                return;
            }

            if (!chatKey) return;

            const isPoll = parsed?.customType === "poll";
            const isActiveChat = chatKey.split(":")[1] === activeChatId;
            const actionTime = resolveActionTime(d);
            const msgId = resolveMessageId(d, actionTime);
            const chatName = chatKey.split(":")[1];

            let displayText = "";
            if (isPoll) {
                displayText = parsed?.poll?.question || parsed?.question || "Biểu quyết";

            } else if (isCallLog) {
                displayText = parsed?.text || "Cuộc gọi";
            } else if (parsed?.type === "emoji") {
                if (Array.isArray(parsed?.cps)) {
                    displayText = parsed.cps
                        .map(hex => String.fromCodePoint(parseInt(hex, 16)))
                        .join("");
                } else {
                    displayText = parsed?.text || "";
                }
            } else if (parsed?.type === "sticker" || parsed?.type === "gif" ||
                parsed?.type === "image" || parsed?.type === "video" ||
                parsed?.type === "audio" || parsed?.type === "file") {
                displayText = parsed?.text || "";
            } else if (parsed?.type === "richText") {
                displayText = parsed?.text || "";
            } else if (parsed?.type === "forward") {
                displayText = parsed?.meta?.forward?.note || "";
            } else {
                displayText = parsed?.text || (typeof mes === "string" ? mes : "");
            }

            dispatch(
                addMessage({
                    chatKey,
                    message: {
                        id: msgId,
                        chatKey,
                        text: displayText,
                        rawMes: typeof d?.rawMes === "string" ? d.rawMes : rawText,
                        mes: typeof d?.mes === "string" ? d.mes : rawText,
                        sender:
                            String(from).toLowerCase() === String(currentUser).toLowerCase()
                                ? "user"
                                : "other",
                        actionTime,
                        time: formatVNDateTime(actionTime),
                        type: isPoll ? "poll" : (isCallLog ? "call_log" : (parsed?.type || "text")),
                        poll: isPoll ? (parsed?.poll || parsed) : null,
                        from,
                        to,
                        url: parsed?.url || null,
                        fileName: parsed?.fileName || null,
                        meta: parsed?.meta || null,
                        blocks: parsed?.blocks || [],
                        callType: parsed?.callType || null,
                        duration: parsed?.duration || null,
                        wasMissed: parsed?.wasMissed || false,
                    },
                })
            );

            dispatch(
                setListUser({
                    name: chatName,
                    lastMessage: previewToText(rawText) || rawText,
                    actionTime,
                    type: d.type === "ROOM_CHAT" || messageType === 1 ? "room" : "people",
                    from: d.name,
                    increaseUnread: !isActiveChat,
                    noReorder: isActiveChat,
                })
            );




        };

        const onHistory = (payload) => {
            const { status, event, data } = payload || {};
            if (status !== "success") return;

            const mapHistoryMessage = (m) => {
                const parsed = tryParseCustomPayload(m?.mes);

                if (
                    parsed?.customType === "typing" ||
                    parsed?.customType === "call_request" ||
                    parsed?.customType === "call_accepted" ||
                    parsed?.customType === "call_rejected" ||
                    parsed?.customType === "call_signal" ||
                    parsed?.customType === "reaction"
                ) {
                    return null;
                }

                const actionTime = resolveActionTime(m);
                const msgId = resolveMessageId(m, actionTime || Date.now() + Math.random());

                const isCallLog = parsed?.customType === "call_log" || parsed?.type === "call_log";

                if (parsed?.customType === "poll") {
                    return {
                        id: msgId,
                        text: parsed?.question || "Cuộc thăm dò ý kiến",
                        sender: String(m?.name).toLowerCase() === String(currentUser).toLowerCase()
                            ? "user"
                            : "other",
                        actionTime,
                        time: formatVNDateTime(m?.createAt || actionTime || Date.now()),
                        type: "poll",
                        from: m?.name,
                        to: m?.to,
                        poll: parsed.poll || parsed,
                        rawMes: typeof m?.mes === "string" ? m.mes : "",
                        mes: typeof m?.mes === "string" ? m.mes : "",
                    };
                }

                return {
                    id: msgId,
                    text: isCallLog
                        ? parsed?.text ?? (m?.mes || "")
                        : parsed?.text ?? (m?.mes || ""),
                    sender:
                        String(m?.name).toLowerCase() === String(currentUser).toLowerCase()
                            ? "user"
                            : "other",
                    actionTime,
                    time: formatVNDateTime(m?.createAt || actionTime || Date.now()),
                    type: isCallLog ? "call_log" : parsed?.type || m?.messageType || "text",
                    from: m?.name,
                    to: m?.to,
                    url: parsed?.url || m?.url || null,
                    fileName: parsed?.fileName || null,
                    meta: parsed?.meta || null,
                    blocks: parsed?.blocks || [],
                    rawMes: typeof m?.mes === "string" ? m.mes : "",
                    mes: typeof m?.mes === "string" ? m.mes : "",
                };
            };

            if (event === "GET_PEOPLE_CHAT_MES" && Array.isArray(data)) {
                const otherUser = data[0]?.name === currentUser ? data[0]?.to : data[0]?.name;
                const ck = `user:${otherUser}`;

                const raw = data.slice().reverse();
                const reactionEvents = [];
                const baseMessages = [];

                raw.forEach((m) => {
                    const parsed = tryParseCustomPayload(m?.mes);
                    if (parsed?.customType === "reaction") {
                        reactionEvents.push({
                            messageId: parsed.messageId,
                            emoji: parsed.emoji,
                            user: parsed.user,
                        });
                        return;
                    }
                    const mm = mapHistoryMessage(m);
                    if (mm) baseMessages.push(mm);
                });

                const page = payload?.page;
                dispatch(setHistory({chatKey: ck, messages: baseMessages, page, hasMore: baseMessages.length > 0,}));

                reactionEvents.forEach((ev) => {
                    if (!ev.messageId || !ev.emoji || !ev.user) return;
                    dispatch(toggleReaction({ chatKey: ck, ...ev }));
                });
            }

            if (event === "GET_ROOM_CHAT_MES" && Array.isArray(data?.chatData)) {
                const ck = `group:${data.name}`;

                const raw = data.chatData.slice().reverse();
                const reactionEvents = [];
                const baseMessages = [];

                raw.forEach((m) => {
                    const parsed = tryParseCustomPayload(m?.mes);
                    if (parsed?.customType === "reaction") {
                        reactionEvents.push({
                            messageId: parsed.messageId,
                            emoji: parsed.emoji,
                            user: parsed.user,
                        });
                        return;
                    }
                    const mm = mapHistoryMessage(m);
                    if (mm) baseMessages.push(mm);
                });
                const page = payload?.page;
                dispatch(setHistory({chatKey: ck, messages: baseMessages, page, hasMore: baseMessages.length > 0,}));

                reactionEvents.forEach((ev) => {
                    if (!ev.messageId || !ev.emoji || !ev.user) return;
                    dispatch(toggleReaction({ chatKey: ck, ...ev }));
                });
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
    }, [currentUser, callLogic, dispatch, activeChatId]);

    return {
        loadHistory: (page, chat) => {
            if (!chat) return;
            chatSocketServer.send(
                chat.type === "room" ? "GET_ROOM_CHAT_MES" : "GET_PEOPLE_CHAT_MES",
                { name: chat.name, page }
            );
        },
    };
}
