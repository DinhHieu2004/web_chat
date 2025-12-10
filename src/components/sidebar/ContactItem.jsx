import React from 'react';
import { Users } from 'lucide-react';


export default function ContactItem({ contact, active, onClick }) {
return (
<div
onClick={onClick}
className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${
active ? 'bg-purple-50 border-l-4 border-purple-500' : ''
}`}
>
<div className="relative">
<div className="w-12 h-12 bg-linear-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-2xl">
{contact.avatar}
</div>
{contact.online && (
<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
)}
</div>
<div className="flex-1 min-w-0">
<div className="flex items-center justify-between mb-1">
<h3 className="font-semibold text-gray-800 truncate flex items-center gap-1">
{contact.name}
{contact.type === 'group' && <Users size={14} className="text-gray-500" />}
</h3>
<span className="text-xs text-gray-500">{contact.time}</span>
</div>
<div className="flex items-center justify-between">
<p className="text-sm text-gray-500 truncate">{contact.lastMessage}</p>
{contact.unread > 0 && (
<span className="bg-purple-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">{contact.unread}</span>
)}
</div>
{contact.type === 'group' && <p className="text-xs text-gray-400 mt-1">{contact.members} thành viên</p>}
</div>
</div>
);
}