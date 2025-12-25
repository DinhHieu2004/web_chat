import React from "react";
import MessageItem from "./MessageItem";

export default function MessageList({
  messages,
  messagesEndRef,
  activeChat,
  messageRefs,
  onReply,
  onForward,
}) {
  const isRoom = activeChat?.type === "room";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 bg-linear-to-br from-purple-50 to-blue-50">
      {messages.map((m) => (
        <div
          key={m.id}
          ref={(el) => {
            if (!messageRefs?.current) return;
            if (el) messageRefs.current[m.id] = el;
            else delete messageRefs.current[m.id];
          }}
        >
          <MessageItem msg={m} isRoom={isRoom} onReply={onReply} />
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
