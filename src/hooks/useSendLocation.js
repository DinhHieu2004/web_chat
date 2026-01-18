import { useCallback } from "react";
import { getLocation } from '../services/locationService';
import { useDispatch, useSelector } from "react-redux";
import { addMessage } from "../redux/slices/chatSlice";
import { formatVNDateTime, makeOutgoingPayload } from "../utils/chatDataFormatter";
import { chatSocketServer } from '../services/socket';
import { setListUser } from "../redux/slices/listUserSlice";

export function useShareLocation({
    activeChat,
    chatKey,
    currentUser,
}) {
    const dispatch = useDispatch();
    const username = useSelector((state) => state.auth.user);

    const sendLocation = useCallback(async () => {
        if (!activeChat || !chatKey) return;

        try {
            const { lat, lng } = await getLocation();

            const url = `https://www.google.com/maps?q=${lat},${lng}`;

            const now = Date.now();

            const locationText = `Vị trí của: ${username || "người dùng"}`;

            const payload = JSON.stringify({
                customType: "location",
                lat, 
                lng,
                url,
                text: locationText,
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
                        mes: payload,
                        text: locationText,
                        url: url,
                        sender: "user",
                        from: currentUser?.name || currentUser,
                        to: activeChat.name,
                        actionTime: now,
                        time: formatVNDateTime(now),
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
    }, [activeChat, chatKey,currentUser, dispatch, username]);
    return { sendLocation };
}