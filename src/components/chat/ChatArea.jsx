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
  toggleSearchPanel,
  messageRefs,

  ...rest
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ChatHeader activeChat={activeChat} onOpenSearch={toggleSearchPanel} />

      <MessageList
        messages={messages}
        messagesEndRef={messagesEndRef}
        activeChat={activeChat}
        messageRefs={messageRefs}
        onReply={handlers.startReply}
        onForward={handlers.startForward}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        handlers={handlers}
        replyMsg={handlers.replyMsg}
        clearReply={handlers.clearReply}
        getMessagePreview={handlers.getMessagePreview}
        showEmojiPicker={showEmojiPicker}
        toggleEmojiPicker={toggleEmojiPicker}
        {...rest}
      />
    </div>
  );
}
