import { useState, useEffect, useRef, useCallback } from "react";
import { chatSocketServer } from "../services/socket";
import { makeOutgoingPayload } from "../utils/chatDataFormatter";

export function useTypingLogic({ activeChat, userName, input }) {
    const [typing, setTyping] = useState({});
    const typingTimeoutRef = useRef(null);
    const isTypingActive = useRef(false);

    const sendTypingSignal = useCallback((isTyping) => {
        if (!activeChat) return;

        chatSocketServer.send(
            "SEND_CHAT",
            makeOutgoingPayload({
                type: activeChat.type,
                to: activeChat.name,
                mes: JSON.stringify({
                    customType: "typing",
                    isTyping: isTyping,
                    from: userName,
                }),
            })
        );
    }, [activeChat, userName]);

    useEffect(() => {
        if (!input?.trim()) {
            if (isTypingActive.current) {
                sendTypingSignal(false);
                isTypingActive.current = false;
            }
            return;
        }

        if (!isTypingActive.current) {
            sendTypingSignal(true);
            isTypingActive.current = true;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            sendTypingSignal(false);
            isTypingActive.current = false;
        }, 3000);

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [input, sendTypingSignal]);

    const handleIncomingTyping = useCallback((parsed, from) => {
        if (parsed?.customType === "typing") {
            if (parsed.isTyping) {
                setTyping((prev) => ({ ...prev, [from]: true }));

                setTimeout(() => {
                    setTyping((prev) => {
                        const updated = { ...prev };
                        delete updated[from];
                        return updated;
                    });
                }, 5000);
            } else {
                setTyping((prev) => {
                    const updated = { ...prev };
                    delete updated[from];
                    return updated;
                });
            }
            return true;
        }
        return false;
    }, []);

    useEffect(() => {
        setTyping({});
        isTypingActive.current = false;
    }, [activeChat?.name]);

    const stopTyping = useCallback(() => {
        if (isTypingActive.current) {
            sendTypingSignal(false);
            isTypingActive.current = false;
        }
    }, [sendTypingSignal]);

    return {
        typing,
        handleIncomingTyping,
        stopTyping, 

    };
}