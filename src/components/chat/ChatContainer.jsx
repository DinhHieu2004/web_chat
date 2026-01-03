import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { setActiveChat } from "../../redux/slices/listUserSlice";
import { useMemo, useEffect, useRef, useState } from "react";

import ChatSearchPanel from "./ChatSearchPanel";
import ForwardMessageModal from "./ForwardMessageModal";

import Sidebar from "../sidebar/Sidebar";
import ChatArea from "./ChatArea";
import useChatLogic from "../../hooks/useChatLogic";
import CallButtons from "./CallButtons";
import IncomingCallModal from "./IncomingCallModal";
import VideoCallScreen from "./VideoCallScreen";

export default function ChatContainer({ toggleTheme }) {
  const dispatch = useDispatch();

  // const { list, activeChatId } = useSelector((state) => state.listUser);
  // const user = useSelector((state) => state.auth.user);

  const list = useSelector((state) => state.listUser.list);
  const activeChatId = useSelector((state) => state.listUser.activeChatId);
  const user = useSelector((state) => state.auth.user);

  // const activeChat = list.find((c) => c.name === activeChatId) || null;
  const activeChat = useMemo(() => {
    return list.find((c) => c.name === activeChatId) || null;
  }, [list, activeChatId]);

  const chat = useChatLogic({
    activeChat,
    setActiveChat: (contact) => dispatch(setActiveChat(contact.name)),
    currentUser: user,
  });

  const [undoToast, setUndoToast] = useState(null);

  const undoTimerRef = useRef(null);
  const undoTickRef = useRef(null);

  const handleDeleteForMeWithUndo = (msg) => {
    if (!msg?.id) return;

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoTickRef.current) clearInterval(undoTickRef.current);

    const index = Array.isArray(chat.messages)
      ? chat.messages.findIndex((m) => m.id === msg.id)
      : -1;

    chat.handlers.handleDeleteForMe(msg);

    setUndoToast({
      status: "pending",
      targetChatKey: chat.chatKey,
      msg,
      index: index >= 0 ? index : 0,
      secondsLeft: 5,
    });

    undoTickRef.current = setInterval(() => {
      setUndoToast((prev) => {
        if (!prev || prev.status !== "pending") return prev;
        const next = (prev.secondsLeft || 1) - 1;
        if (next <= 0) return { ...prev, secondsLeft: 0 };
        return { ...prev, secondsLeft: next };
      });
    }, 1000);

    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
      if (undoTickRef.current) clearInterval(undoTickRef.current);
      undoTickRef.current = null;
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoTickRef.current) clearInterval(undoTickRef.current);
    };
  }, []);

  const handleUndoClick = () => {
    if (!undoToast?.msg) return;

    // clear pending timeout
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoTickRef.current) clearInterval(undoTickRef.current);
    undoTimerRef.current = null;
    undoTickRef.current = null;
    chat.handlers.markSkipNextAutoScroll?.();

    chat.handlers.handleUndoDeleteForMe(
      undoToast.targetChatKey,
      undoToast.msg,
      undoToast.index
    );

    setUndoToast({ status: "success" });

    setTimeout(() => setUndoToast(null), 1200);
  };

  const isGroupChat = activeChat?.type === "room";

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 p-2 overflow-hidden">
      <Sidebar
        toggleTheme={toggleTheme}
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
            Đăng xuất
          </button>
        </div>

        {/* Call error banner */}
        {chat.callLogic.callError && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow z-50">
            <strong>Call error:</strong> {chat.callLogic.callError}
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <ChatArea
            handlers={{
              ...chat.handlers,
              onVoiceCall: chat.callLogic.startVoiceCall,
              onVideoCall: chat.callLogic.startVideoCall,
            }}
            onDeleteForMe={handleDeleteForMeWithUndo}
            undoToast={undoToast}
            onUndoDelete={handleUndoClick}
            onCloseUndoToast={() => setUndoToast(null)}
            onRecallMessage={chat.handlers.handleRecallMessage}
            activeChat={activeChat}
            messages={chat.messages}
            input={chat.input}
            setInput={chat.setInput}
            // handlers={chat.handlers}
            messagesEndRef={chat.messagesEndRef}
            replyMsg={chat.replyMsg}
            clearReply={chat.clearReply}
            getMessagePreview={chat.getMessagePreview}
            showSearchPanel={chat.showSearchPanel}
            toggleSearchPanel={chat.handlers.toggleSearchPanel}
            closeSearchPanel={chat.handlers.closeSearchPanel}
            messageSearchQuery={chat.messageSearchQuery}
            setMessageSearchQuery={chat.setMessageSearchQuery}
            matchIds={chat.matchIds}
            activeMatchIndex={chat.activeMatchIndex}
            gotoNextMatch={chat.gotoNextMatch}
            gotoPrevMatch={chat.gotoPrevMatch}
            messageRefs={chat.messageRefs}
            isGroupChat={isGroupChat}
            toggleGroupMenu={chat.handlers.toggleGroupMenu}
            toggleEmojiPicker={chat.handlers.toggleEmojiPicker}
            showEmojiPicker={chat.showEmojiPicker}
            showGroupMenu={chat.showGroupMenu}
            typing={chat.typing}
            callLogic={chat.callLogic}
            location={chat.location}
          />
          <ForwardMessageModal
            open={chat.showForwardModal}
            onClose={chat.handlers.closeForward}
            onSend={chat.handlers.handleConfirmForward}
            contacts={chat.contacts}
            messagePreview={chat.forwardPreview}
          />

          <ChatSearchPanel
            open={chat.showSearchPanel}
            onClose={() => {
              chat.handlers.closeSearchPanel();
              chat.setMessageSearchQuery("");
              chat.setSenderFilter("ALL");
              chat.setDateFilter("ALL");
            }}
            query={chat.messageSearchQuery}
            setQuery={chat.setMessageSearchQuery}
            results={chat.filteredResults}
            activeChatName={activeChat?.name}
            onPickMessage={(id) => {
              chat.scrollToMatchById(id);
            }}
            senderFilter={chat.senderFilter}
            setSenderFilter={chat.setSenderFilter}
            dateFilter={chat.dateFilter}
            setDateFilter={chat.setDateFilter}
            senderOptions={chat.senderOptions}
          />
        </div>

        {chat.callLogic.incomingCall && (
          <IncomingCallModal
            from={chat.callLogic.incomingCall.from}
            callType={chat.callLogic.incomingCall.callType}
            isGroup={chat.callLogic.incomingCall.isGroup}
            groupName={chat.callLogic.incomingCall.groupName}
            onAccept={chat.callLogic.acceptCall}
            onReject={chat.callLogic.rejectCall}
          />
        )}

        {chat.callLogic.showCallScreen && (
          <VideoCallScreen
            roomUrl={chat.callLogic.currentRoomUrl}
            callType={chat.callLogic.currentCallType}
            onLeave={chat.callLogic.endCall}
            peerRinging={chat.callLogic.peerRinging}
          />
        )}
      </div>
    </div>
  );
}
