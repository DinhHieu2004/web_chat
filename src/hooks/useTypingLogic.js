import { useState, useEffect, useRef, useCallback } from "react";
import { chatSocketServer } from "../services/socket";
import { makeOutgoingPayload } from "../utils/chatDataFormatter"

export function useTypingLogic({ activeChat, userName, input }) {
    const [typing, setTyping] = useState({});
    const isTypingActive = useRef(false);

    const sendTypingSignal = useCallback((isTying) => {
        if (!activeChat) return;

        const payload = JSON.stringify({
            customType: "typing",
            isTying,

        })
        chatSocketServer.send(
            "SEND_CHAT",
            makeOutgoingPayload({
                type: activeChat.type,
                to: activeChat.name,
                mes: payload

            }),
        );
    }, [activeChat]);

    const handleBlur = useCallback(() => {
        if (!isTypingActive.current) return;

        sendTypingSignal(false);
        isTypingActive.current = false;
    }, [sendTypingSignal]);

    const handleIncomingTyping = useCallback((parsed, from) => {
        if (parsed?.customType !== "typing") return false;

        if (parsed.isTyping) {
            setTyping(prev => ({ ...prev, [from]: true }));
        } else {
            setTyping(prev => {
                const updated = { ...prev };
                delete updated[from];
                return updated;
            });
        }
        return true;
    }, []);

    useEffect(() => {
        setTyping({});
        isTypingActive.current = false;
    }, [activeChat?.name]);

    return {
        typing,
        handleFocus,
        handleBlur,
        handleIncomingTyping,
    };

}