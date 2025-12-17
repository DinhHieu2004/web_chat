import React from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export default function ChatArea({
  activeChat,
  messages,
  input,
  setInput,
  handlers,
  messagesEndRef,

  showEmojiPicker,
  toggleEmojiPicker,

  ...rest
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ChatHeader activeChat={activeChat} />

      <MessageList
        messages={messages}
        messagesEndRef={messagesEndRef}
        activeChat={activeChat}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        handlers={handlers}
        showEmojiPicker={showEmojiPicker}
        toggleEmojiPicker={toggleEmojiPicker}
        {...rest}
      />
    </div>
  );
}
