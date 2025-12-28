import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { setActiveChat } from "../../redux/slices/listUserSlice";

import ChatSearchPanel from "./ChatSearchPanel";
import ForwardMessageModal from "./ForwardMessageModal";

import Sidebar from "../sidebar/Sidebar";
import ChatArea from "./ChatArea";
import useChatLogic from "../../hooks/useChatLogic";

export default function ChatContainer() {
  const dispatch = useDispatch();

  const { list, activeChatId } = useSelector((state) => state.listUser);
  const user = useSelector((state) => state.auth.user);

  const activeChat = list.find((c) => c.name === activeChatId) || null;

  const chat = useChatLogic({
    activeChat,
    setActiveChat: (contact) => dispatch(setActiveChat(contact.name)),
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
            Đăng xuất
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <ChatArea
            activeChat={activeChat}
            messages={chat.messages}
            input={chat.input}
            setInput={chat.setInput}
            handlers={chat.handlers}
            messagesEndRef={chat.messagesEndRef}
            replyMsg={chat.replyMsg}
            clearReply={chat.clearReply}
            getMessagePreview={chat.getMessagePreview}
            showSearchPanel={chat.showSearchPanel}
            toggleSearchPanel={chat.toggleSearchPanel}
            messageSearchQuery={chat.messageSearchQuery}
            setMessageSearchQuery={chat.setMessageSearchQuery}
            matchIds={chat.matchIds}
            activeMatchIndex={chat.activeMatchIndex}
            gotoNextMatch={chat.gotoNextMatch}
            gotoPrevMatch={chat.gotoPrevMatch}
            messageRefs={chat.messageRefs}
            isGroupChat={isGroupChat}
            typing={chat.typing}
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
              chat.closeSearchPanel();
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
      </div>
    </div>
  );
}