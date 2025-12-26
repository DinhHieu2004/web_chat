import React from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import PollCreator from "./PollCreator";

export default function ChatArea({
  activeChat,
  messages,
  input,
  setInput,
  handlers,
  messagesEndRef,
  showGroupMenu,
  toggleGroupMenu,
  showEmojiPicker,
  toggleEmojiPicker,
  isGroupChat,
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
        onVote={handlers?.handleSendPollVote}
      />

      {showGroupMenu && isGroupChat && (
        <PollCreator
          onClose={toggleGroupMenu}
          onCreate={({ question, options }) => {
            handlers.handleSendPoll(question, options);
            toggleGroupMenu();
          }}
        />
      )}

      <ChatInput
        input={input}
        setInput={setInput}
        handlers={handlers}
        replyMsg={handlers.replyMsg}
        clearReply={handlers.clearReply}
        getMessagePreview={handlers.getMessagePreview}
        showEmojiPicker={showEmojiPicker}
        toggleEmojiPicker={toggleEmojiPicker}
        isGroupChat={isGroupChat}
        toggleGroupMenu={toggleGroupMenu}
        {...rest}
      />
    </div>
  );
}
