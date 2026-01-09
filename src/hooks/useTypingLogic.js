import { useState, useEffect, useRef, useCallback } from "react";
import { chatSocketServer } from "../services/socket";
import { makeOutgoingPayload } from "../utils/chatDataFormatter";
import { useSelector } from "react-redux";

export function useTypingLogic({ activeChat }) {
    const userName = useSelector(state => state.auth.user);
    const [typing, setTyping] = useState({});
    const isTypingActive = useRef(false);
    const typingTimeoutRef = useRef({});

    const sendTypingSignal = useCallback((isTyping) => {
        if (!activeChat) return;
        const payload = JSON.stringify({
            customType: "typing",
            isTyping: isTyping,
            from: userName,
        });

        chatSocketServer.send("SEND_CHAT", makeOutgoingPayload({
            type: activeChat.type,
            to: activeChat.name,
            mes: payload
        }));
    }, [activeChat, userName]);

    const handleFocus = useCallback(() => {
        if (!isTypingActive.current) {
            sendTypingSignal(true);
            isTypingActive.current = true;
        }
    }, [sendTypingSignal]);

    const handleBlur = useCallback(() => {
        if (isTypingActive.current) {
            sendTypingSignal(false);
            isTypingActive.current = false;
        }
    }, [sendTypingSignal]);

    useEffect(() => {
        const onTyping = (data) => {
            const { from, isTyping, to } = data;
            
            if (String(from).toLowerCase() === String(userName).toLowerCase()) {
                return;
            }

            if (!activeChat) return;

            const isCurrentChat = 
                (activeChat.type === "room" && to === activeChat.name) ||
                (activeChat.type === "people" && from === activeChat.name);
            
            if (!isCurrentChat) return;

            setTyping(prev => {
                const next = { ...prev };
                
                if (isTyping) {
                    next[from] = true;
                    
                    if (typingTimeoutRef.current[from]) {
                        clearTimeout(typingTimeoutRef.current[from]);
                    }
                    
                    typingTimeoutRef.current[from] = setTimeout(() => {
                        setTyping(prev2 => {
                            const next2 = { ...prev2 };
                            delete next2[from];
                            return next2;
                        });
                        delete typingTimeoutRef.current[from];
                    }, 3000);
                } else {
                    delete next[from];
                    
                    if (typingTimeoutRef.current[from]) {
                        clearTimeout(typingTimeoutRef.current[from]);
                        delete typingTimeoutRef.current[from];
                    }
                }
                
                return next;
            });
        };

        chatSocketServer.on("TYPING", onTyping);
        
        return () => {
            chatSocketServer.off("TYPING", onTyping);
            Object.values(typingTimeoutRef.current).forEach(timeout => {
                clearTimeout(timeout);
            });
            typingTimeoutRef.current = {};
        };
    }, [userName, activeChat]);

    useEffect(() => {
        setTyping({});
        isTypingActive.current = false;
        
        Object.values(typingTimeoutRef.current).forEach(timeout => {
            clearTimeout(timeout);
        });
        typingTimeoutRef.current = {};
    }, [activeChat?.name]);

    return { typing, handleFocus, handleBlur };
}