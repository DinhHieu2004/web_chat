import React from 'react';


export default function MessageItem({ msg }) {
return (
<div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
<div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
msg.sender === 'user'
? 'bg-linear-to-r from-purple-500 to-blue-500 text-white rounded-br-none'
: 'bg-white text-gray-800 rounded-bl-none'
} ${msg.type === 'sticker' ? 'text-5xl bg-transparent shadow-none' : ''}`}>
<p className={`${msg.type === 'sticker' ? 'text-5xl' : 'text-sm'} wrap-break-words`}>{msg.text}</p>
{msg.type !== 'sticker' && <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-purple-100' : 'text-gray-400'}`}>{msg.time}</p>}
</div>
</div>
);
}