import { getLocation } from '../services/locationService';
import { useDispatch } from "react-redux";
import { addMessage } from "../redux/slices/chatSlice";
import { formatVNDateTime, makeOutgoingPayload } from "../utils/chatDataFormatter";
import { chatSocketServer } from '../services/socket';

export function useShareLocation({
    activeChat,
    chatKey,
    currentUser,
}) {
    const dispatch = useDispatch();

    const sendLocation = useCallback(async () => {
        if (!activeChat || !chatKey) return;

        try {
            const { lat, lng } = await getLocation();

            const now = Date.now();

            const payload = JSON.stringify({
                customType: "location",
                lat,
                lng,
                text: "Vi tri của: " + currentUser?.name,
                from: currentUser?.name || currentUser,
                sentAt: new Date(now).toISOString(),
            });
            chatSocketServer.send(
                "SEND_CHAT",
                makeOutgoingPayload({
                    type: activeChat.type,
                    to: activeChat.name,
                    mes: payload,
                })
            );

            dispatch(
                addMessage({
                    chatKey:
                        activeChat.type === "room"
                            ? `group:${activeChat.name}`
                            : `user:${activeChat.name}`,
                    message: {
                        id: `local-location-${now}`,
                        type: "location",
                        text: "Vị trí của:" + currentUser?.name,
                        lat,
                        lng,
                        sender: "user",
                        from: currentUser?.name || currentUser,
                        to: activeChat.name,
                        actionTime: now,
                        time: formatVNDateTime(now),
                        optimistic: true,
                    },

                })
            );
            dispatch(
                setListUser({
                    name: activeChat.name,
                    lastMessage: "Vị trí",
                    actionTime: now,
                    type: activeChat.type,
                })
            );

        } catch (err) {
            console.log("k gui dc", err);
        }
    }, [activeChat, currentUser, dispatch]);
    return { sendLocation };
};