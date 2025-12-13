import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { initSocket, reLoginUser } from './redux/slices/authSlice';
import AuthForm from './components/auth/AuthForm';

import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import { contacts as initialContacts } from './data/contacts'; 
import useChatLogic from './hooks/useChatLogic'; 

export default function App() {
    const dispatch = useDispatch();
    
    const { isAuthenticated, status } = useSelector((state) => state.auth);
    const isLoading = status === 'loading';

    useEffect(() => {
        dispatch(initSocket());

        const storedUser = localStorage.getItem('user');
        const storedCode = localStorage.getItem('reLoginCode');

        if (storedUser && storedCode && !isAuthenticated) {
            console.log('Found stored credentials, attempting RE_LOGIN...');
            dispatch(reLoginUser({ user: storedUser, code: storedCode }));
        }
    }, [dispatch, isAuthenticated]);

 
    const [contacts] = useState(initialContacts);
    const [activeChat, setActiveChat] = useState(contacts[0]);

    // Hook xử lý logic chat
    const chat = useChatLogic({ activeChat, setActiveChat, initialContacts: contacts });


    if (isLoading || !isAuthenticated) {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-screen bg-gray-200 text-lg font-semibold">
                    {}
                    Đang kết nối / Đăng nhập lại...
                </div>
            );
        }
        
        return <AuthForm />;
    }

    return (
        <div className="flex h-screen bg-gray-100 p-2">
            {/* ------------------- Sidebar (Danh sách liên hệ) ------------------- */}
            <Sidebar
                contacts={contacts}
                activeChat={chat.activeChat}
                onSelect={chat.handleChatSelect}
                searchTerm={chat.searchTerm}
                setSearchTerm={chat.setSearchTerm}
            />
            {/* ------------------- Chat Area (Cửa sổ chat) ------------------- */}
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