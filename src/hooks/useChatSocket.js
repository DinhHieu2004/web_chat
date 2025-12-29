import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { chatSocketServer } from "../services/socket";
import { addMessage, setHistory } from "../redux/slices/chatSlice";
import { setListUser } from "../redux/slices/listUserSlice";
import {
    tryParseCustomPayload,
    makeChatKeyFromWs,
    formatVNDateTime,
} from "../utils/chatDataFormatter";

export function useChatSocket(currentUser, callLogic) {
    const dispatch = useDispatch();

    useEffect(() => {
        if (!currentUser) return;

        const onIncoming = (payload) => {
            const d = payload?.data?.data || payload?.data || payload || {};
            const { from: fromRaw, name, to, mes, type } = d;
            const from = fromRaw || name;

            const rawText = typeof mes === "string" ? mes : mes?.mes || mes?.text || "";
            const parsed = tryParseCustomPayload(rawText);

            if (parsed?.customType === "call_request" && from !== currentUser) {
                callLogic.handleIncomingCall({ ...parsed, from });
                return;
            }
            if (parsed?.customType === "call_accepted") {
                callLogic.notifyPeerRinging(false);
                return;
            }
            if (parsed?.customType === "call_rejected") {
                callLogic.endCall();
                return;
            }
            if (parsed?.customType === "call_signal") {
                if (parsed.action === "accepted") callLogic.notifyPeerRinging(false);
                return;
            }

            const chatKey = makeChatKeyFromWs({
                type: d.type === "ROOM_CHAT" || d.type === "room" ? "room" : "people",
                from,
                to,
                currentUser,
            });

            if (!chatKey) return;

            const now = Date.now();

            dispatch(
                addMessage({
                    chatKey,
                    message: {
                        id: now + Math.random(),
                        text: parsed ? parsed.text : rawText,
                        sender: String(from).toLowerCase() === String(currentUser).toLowerCase() ? "user" : "other",
                        actionTime: now,
                        time: formatVNDateTime(now),
                        type: parsed?.type || "text",
                        from,
                        to,
                        url: parsed?.url || null,
                        fileName: parsed?.fileName || null,
                        meta: parsed?.meta || null,
                        blocks: parsed?.blocks || [],
                    },
                })
            );

            dispatch(
                setListUser({
                    name: chatKey.split(":")[1],
                    lastMessage: parsed?.text || rawText,
                    actionTime: now,
                    type: d.type === "ROOM_CHAT" || d.type === "room" ? "room" : "people",
                })
            );
        };

        const onHistory = (payload) => {
            const { status, event, data } = payload || {};
            if (status !== "success") return;

            const mapHistoryMessage = (m) => {
                const parsed = tryParseCustomPayload(m?.mes);
                const ts = m?.createAt ? Date.parse(m.createAt) : 0;
                const actionTime = Number.isNaN(ts) ? 0 : ts;
                return {
                    id: m?.id ?? (actionTime || Date.now() + Math.random()),
                    text: parsed ? parsed.text : m?.mes || "",
                    sender: String(m?.name).toLowerCase() === String(currentUser).toLowerCase() ? "user" : "other",
                    actionTime,
                    time: formatVNDateTime(m?.createAt || actionTime || Date.now()),
                    type: parsed?.type || m?.messageType || "text",
                    from: m?.name,
                    to: m?.to,
                    url: parsed?.url || m?.url || null,
                    fileName: parsed?.fileName || null,
                    meta: parsed?.meta || null,
                    blocks: parsed?.blocks || [],
                };
            };

            if (event === "GET_PEOPLE_CHAT_MES" && Array.isArray(data)) {
                const otherUser = data[0]?.name === currentUser ? data[0]?.to : data[0]?.name;
                dispatch(setHistory({
                    chatKey: `user:${otherUser}`,
                    messages: data.slice().reverse().map(mapHistoryMessage).filter(Boolean),
                }));
            }

            if (event === "GET_ROOM_CHAT_MES" && Array.isArray(data?.chatData)) {
                dispatch(setHistory({
                    chatKey: `group:${data.name}`,
                    messages: data.chatData.slice().reverse().map(mapHistoryMessage).filter(Boolean),
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
    }, [currentUser, callLogic, dispatch]);

    return {
        loadHistory: (page = 1, chat) => {
            if (!chat) return;
            chatSocketServer.send(
                chat.type === "room" ? "GET_ROOM_CHAT_MES" : "GET_PEOPLE_CHAT_MES",
                { name: chat.name, page }
            );
        },
    };
}