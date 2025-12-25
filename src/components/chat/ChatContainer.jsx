import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { setActiveChat } from "../../redux/slices/listUserSlice";

import Sidebar from "../sidebar/Sidebar";
import ChatArea from "./ChatArea";
import useChatLogic from "../../hooks/useChatLogic";

export default function ChatContainer() {
    const dispatch = useDispatch();

    const { list, activeChatId } = useSelector(
        (state) => state.listUser
    );
    const user = useSelector((state) => state.auth.user);

    const activeChat =
        list.find((c) => c.name === activeChatId) || null;

    const chat = useChatLogic({
        activeChat,
        setActiveChat: (contact) =>
            dispatch(setActiveChat(contact.name)),
        currentUser: user,
    });

    const isGroupChat = activeChat?.type === "room";


    return (
        <div className="flex h-screen bg-gray-100 p-2 overflow-hidden">
            <Sidebar
                searchTerm={chat.searchTerm}
                setSearchTerm={chat.setSearchTerm}
                onSelectContact={chat.handlers.handleChatSelect}
            />

            <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-end p-2">
                    <button
                        onClick={() => dispatch(logout())}
                        className="px-4 py-2 bg-red-500 text-white rounded"
                    >
                        Logout
                    </button>
                </div>

                <ChatArea
                    activeChat={activeChat}
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
                    isGroupChat={isGroupChat}
                />
            </div>
        </div>
    );
}
