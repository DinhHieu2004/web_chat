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
    typing,
    ...rest
}) {
    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <ChatHeader activeChat={activeChat} onOpenSearch={toggleSearchPanel} />

            <MessageList
                messages={messages}
                messagesEndRef={messagesEndRef}
                activeChat={activeChat}
                onVote={handlers?.handleSendPollVote}
                messageRefs={messageRefs}
                onReply={handlers.startReply}
            />

            {/* POLL CREATOR */}
            {showGroupMenu && isGroupChat && (
                <PollCreator
                    onClose={toggleGroupMenu}
                    onCreate={({ question, options }) => {
                        handlers.handleSendPoll(question, options);
                        toggleGroupMenu();
                    }}
                />
            )}
            {
                typing && Object.keys(typing).length > 0 && (
                    <div className="px-4 py-1 flex items-center gap-2 text-xs text-blue-500 italic font-medium bg-white/50 animate-fade-in">
                        <div className="flex gap-1">
                            <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
                            <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                        <span>
                            {Object.entries(typing)
                                .filter(([_, isTyping]) => isTyping)
                                .map(([user]) => user)
                                .join(', ')} đang nhập...
                        </span>
                    </div>
                )
            }

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
