import React from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList.jsx';
import ChatInput from './ChatInput';


export default function ChatArea({ activeChat, messages, input, setInput, handlers, messagesEndRef, ...rest }) {
    return (
        <div className="flex-1 flex flex-col">
            <ChatHeader activeChat={activeChat} />
            <MessageList messages={messages} messagesEndRef={messagesEndRef} />
            <ChatInput input={input} setInput={setInput} handlers={handlers} {...rest} />
        </div>
    );
}