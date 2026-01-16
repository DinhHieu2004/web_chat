import React, { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";

export default function MessageList({
    messages,
    messagesEndRef,
    activeChat,
    messageRefs,
    onReply,
    onForward,
    onVote,
    callLogic,
    onDeleteForMe,
    onRecallMessage,
    currentUser,
    onToggleReaction,
    onLoadMore,
    hasMore,
}) {
    const isRoom = activeChat?.type === "room";
    const containerRef = useRef(null);
    const topSentinelRef = useRef(null);
    const loadingRef = useRef(false);

    const userScrolledRef = useRef(false);
    const prevHeightRef = useRef(0);
    const firstLoadRef = useRef(true);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onScroll = () => {
            if (el.scrollTop < el.scrollHeight - el.clientHeight - 20) {
                userScrolledRef.current = true;
            }
        };

        el.addEventListener("scroll", onScroll);
        return () => el.removeEventListener("scroll", onScroll);
    }, []);
    useEffect(() => {
        loadingRef.current = false;
        userScrolledRef.current = false;
        prevHeightRef.current = 0;
        firstLoadRef.current = true;
    }, [activeChat]);

    useEffect(() => {
        const container = containerRef.current;
        const sentinel = topSentinelRef.current;
        if (!container || !sentinel || !hasMore) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                if (!userScrolledRef.current) return;
                if (loadingRef.current) return;
                if (!hasMore) return;

                prevHeightRef.current = container.scrollHeight;
                loadingRef.current = true;

                onLoadMore?.();
            },
            {
                root: container,
                threshold: 0,
                rootMargin: "150px 0px 0px 0px",
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [activeChat, hasMore, onLoadMore]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || messages.length === 0) return;

        if (firstLoadRef.current) {
            container.scrollTop = container.scrollHeight;
            firstLoadRef.current = false;
            return;
        }

        if (loadingRef.current) {
            const newHeight = container.scrollHeight;
            const diff = newHeight - prevHeightRef.current;
            container.scrollTop += diff;
            loadingRef.current = false;
        }

    }, [messages]);


    return (
        <div ref={containerRef} className="flex-1 bg-gray-100 min-h-0 overflow-y-auto px-6 py-4 space-y-4 from-purple-50 to-blue-50">
            {hasMore && <div ref={topSentinelRef} className="h-2" />}
            {messages.map((m) => (
                <div
                    key={m.id}
                    ref={(el) => {
                        if (!messageRefs?.current) return;
                        if (el) messageRefs.current[m.id] = el;
                        else delete messageRefs.current[m.id];
                    }}
                >
                    <MessageItem
                        msg={m}
                        isRoom={isRoom}
                        onReply={onReply}
                        onForward={onForward}
                        onVote={onVote}
                        onRecall={(type) => type === 'video' ? callLogic.startVideoCall() : callLogic.startVoiceCall()}
                        onDeleteForMe={onDeleteForMe}
                        onRecallMessage={onRecallMessage}
                        onToggleReaction={onToggleReaction}
                        currentUser={currentUser ?? null}
                    />
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}
