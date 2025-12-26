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
    ...rest
}) {
    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <ChatHeader activeChat={activeChat} />

            <MessageList
                messages={messages}
                messagesEndRef={messagesEndRef}
                activeChat={activeChat}
                onVote={handlers?.handleSendPollVote}
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

            <ChatInput
                input={input}
                setInput={setInput}
                handlers={handlers}
                showEmojiPicker={showEmojiPicker}
                toggleEmojiPicker={toggleEmojiPicker}
                isGroupChat={isGroupChat}
                toggleGroupMenu={toggleGroupMenu}
                {...rest}
            />
        </div>
    );
}
