import React from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import PollCreator from "./PollCreator";
import { Check } from "lucide-react";

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
  typing,
  callLogic,
  location,
  onDeleteForMe,
  onRecallMessage,
  undoToast,
  onUndoDelete,
  onCloseUndoToast,
  ...rest
}) {
  const typingUsers =
    typing && typeof typing === "object"
      ? Object.entries(typing)
          .filter(([_, isTyping]) => !!isTyping)
          .map(([user]) => user)
      : [];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ChatHeader
        activeChat={activeChat}
        onOpenSearch={toggleSearchPanel}
        onVoiceCall={handlers.onVoiceCall}
        onVideoCall={handlers.onVideoCall}
      />
      <MessageList
        messages={messages}
        messagesEndRef={messagesEndRef}
        activeChat={activeChat}
        messageRefs={messageRefs}
        onReply={handlers.startReply}
        onForward={handlers.startForward}
        onVote={handlers?.handleSendPollVote}
        callLogic={handlers.callLogic}
        onDeleteForMe={onDeleteForMe}
        onRecallMessage={onRecallMessage}
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
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-2 text-xs italic font-medium animate-fade-in
                text-blue-500 bg-white/50
                dark:text-blue-300 dark:bg-gray-900/40">
          <div className="flex gap-1">
            <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
            <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>{typingUsers.join(", ")} đang nhập...</span>
        </div>
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
        location={location}
        {...rest}
      />
      {undoToast && (
        <div className="fixed left-4 bottom-4 z-9999">
          <div
            className="
        w-[360px] max-w-[calc(100vw-2rem)]
        flex items-center justify-between gap-3
        rounded-xl border shadow-md
        px-3 py-2
        bg-white border-gray-200 text-gray-900
        [html[data-theme='dark']_&]:bg-gray-800
        [html[data-theme='dark']_&]:border-gray-600
        [html[data-theme='dark']_&]:text-gray-100
      "
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 min-w-0">
              {undoToast.status === "success" && (
                <span
                  className="
              inline-flex items-center justify-center
              w-5 h-5 rounded-full
              bg-blue-50 text-blue-600
              dark:bg-blue-900/60 dark:text-blue-200
            "
                  aria-hidden="true"
                >
                  <Check size={14} strokeWidth={3} />
                </span>
              )}

              <div className="min-w-0">
                {undoToast.status === "pending" ? (
                  <span className="text-sm font-semibold truncate">
                    {undoToast.count ?? 1} tin nhắn đã xóa
                  </span>
                ) : (
                  <span className="text-sm font-semibold truncate">
                    Khôi phục thành công
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {undoToast.status === "pending" && (
                <button
                  type="button"
                  onClick={onUndoDelete}
                  className="
              rounded-lg px-3 py-1.5 text-sm font-semibold
              border
              bg-blue-50 text-blue-600 border-blue-200
              hover:bg-blue-100
              dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700
              dark:hover:bg-blue-900/45
            "
                >
                  Khôi phục ({undoToast.secondsLeft ?? 5})
                </button>
              )}

              <button
                type="button"
                onClick={onCloseUndoToast}
                className="
            inline-flex items-center justify-center
            w-8 h-8 rounded-md
            text-gray-500 hover:text-gray-700 hover:bg-gray-100
            dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800
          "
                aria-label="Đóng"
                title="Đóng"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
