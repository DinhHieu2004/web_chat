import React from "react";
import SidebarSearch from "./SidebarSearch";
import ContactItem from "./ContactItem";
import CreateRoomModal from "../room/CreateRoomModal";
import JoinRoomModal from "../room/JoinRoomModal";
import { setShowCreateModal, setShowJoinModal } from "../../redux/slices/listUserSlice";
import { useDispatch, useSelector } from "react-redux";
import useSidebarLogic from "../../hooks/useSidebarLogic";
import '../../assets/css/dark_light.css';
import { FaSun, FaMoon } from "react-icons/fa";

export default function Sidebar({searchTerm, setSearchTerm, onSelectContact, toggleTheme}) {
    const dispatch = useDispatch();
    const { showJoinModal, showCreateModal } = useSelector(
        state => state.listUser
    );

    const { filtered, activeChatId, handleSelect } = useSidebarLogic(
        searchTerm,
        onSelectContact
    );

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold text-gray-800">Tin nhắn</h2>

                    <button
                        onClick={toggleTheme}
                        className="relative w-16 h-8 rounded-full bg-gray-300 transition-colors theme-toggle"
                    >
            <span className="theme-thumb">
                <FaSun className="icon-sun text-yellow-500" />
                <FaMoon className="icon-moon" />
            </span>
                    </button>
                </div>
                <SidebarSearch value={searchTerm} onChange={(v) => setSearchTerm(v)}/>

                <div className="gap-2 mt-3">
                    <button
                        onClick={() => dispatch(setShowCreateModal(true))}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium p-2 m-2">
                        + Tạo nhóm
                    </button>
                    <button onClick={() => dispatch(setShowJoinModal(true))}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium p-2 m-2">
                        + Tham gia</button>

                    <button
                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium p-2 m-2">
                        + Thêm bạn</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filtered.map((c) => (
                    <ContactItem
                        key={c.name}
                        contact={c}
                        active={activeChatId === c.name}
                        onClick={() => handleSelect(c)}
                    />
                ))}
            </div>
            {showJoinModal && <JoinRoomModal />}
            {showCreateModal && <CreateRoomModal/>}
        </div>
    );
}

