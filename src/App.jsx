import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { initSocket, reLoginUser } from "./redux/slices/authSlice";
import { setActiveChat as setActiveChatId } from "./redux/slices/listUserSlice";
import AuthForm from "./components/auth/AuthForm";

import Sidebar from "./components/sidebar/Sidebar";
import ChatArea from "./components/chat/ChatArea";
import useChatLogic from "./hooks/useChatLogic";

export default function App() {
  const dispatch = useDispatch();

  const { isAuthenticated, status, user } = useSelector((state) => state.auth);
  const { list, activeChatId } = useSelector((state) => state.listUser);
  const activeChat = list.find((c) => c.name === activeChatId) || null;
  const setActiveChat = (contact) => {
    dispatch(setActiveChatId(contact.name));
  };
  const isLoading = status === "loading";

  useEffect(() => {
    dispatch(initSocket());

    const storedUser = localStorage.getItem("user");
    const storedCode = localStorage.getItem("reLoginCode");

    if (storedUser && storedCode && !isAuthenticated) {
      console.log("Found stored credentials, attempting RE_LOGIN...");
      dispatch(reLoginUser({ user: storedUser, code: storedCode }));
    }
  }, [dispatch, isAuthenticated]);

  // Hook xử lý logic chat
  const chat = useChatLogic({
    activeChat,
    setActiveChat,
    currentUser: user,
  });

  const didAutoSelectRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (didAutoSelectRef.current) return;
    if (!list || list.length === 0) return;

    const target = list.find((c) => c.name === activeChatId) || list[0];
    chat.handlers.handleChatSelect(target);

    didAutoSelectRef.current = true;
  }, [isAuthenticated, list, activeChatId, chat.handlers]);

  useEffect(() => {
    if (!isAuthenticated) {
      didAutoSelectRef.current = false;
    }
  }, [isAuthenticated]);

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
      <Sidebar
        searchTerm={chat.searchTerm}
        setSearchTerm={chat.setSearchTerm}
        onSelectContact={chat.handlers.handleChatSelect}
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
