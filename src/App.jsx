import React, { useState } from 'react';
import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import { contacts as initialContacts } from './data/contacts';
import useChatLogic from './hooks/useChatLogic';


export default function ChatApp() {
const [contacts] = useState(initialContacts);
const [activeChat, setActiveChat] = useState(contacts[0]);


const chat = useChatLogic({ activeChat, setActiveChat, initialContacts: contacts });


return (
<div className="flex h-screen bg-gray-100">
<Sidebar
contacts={contacts}
activeChat={chat.activeChat}
onSelect={chat.handleChatSelect}
searchTerm={chat.searchTerm}
setSearchTerm={chat.setSearchTerm}
/>
<ChatArea
activeChat={chat.activeChat}
messages={chat.messages}
input={chat.input}
setInput={chat.setInput}
handlers={chat.handlers}
messagesEndRef={chat.messagesEndRef}
showEmojiPicker={chat.showEmojiPicker}
showStickerPicker={chat.showStickerPicker}
toggleEmojiPicker={chat.toggleEmojiPicker}
toggleStickerPicker={chat.toggleStickerPicker}
showGroupMenu={chat.showGroupMenu}
toggleGroupMenu={chat.toggleGroupMenu}
/>
</div>
);
}