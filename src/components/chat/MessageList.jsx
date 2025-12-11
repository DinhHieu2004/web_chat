import React from 'react';
import MessageItem from './MessageItem';


export default function MessageList({ messages, messagesEndRef }) {
return (
<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-linear-to-br from-purple-50 to-blue-50">
{messages.map(m => <MessageItem key={m.id} msg={m} />)}
<div ref={messagesEndRef} />
</div>
);
}