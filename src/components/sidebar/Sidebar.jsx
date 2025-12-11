import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import SidebarSearch from './SidebarSearch';
import ContactItem from './ContactItem';
import { setShowCreateModal } from '../../redux/slices/roomSlice';
import CreateRoomModal from '../room/CreateRoomModal';

export default function Sidebar({contacts, activeChat, onSelect, searchTerm, setSearchTerm, onAddFriend}) {
    const dispatch = useDispatch();
    const { showCreateModal } = useSelector(state => state.room);

    const filtered = contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Tin nhắn</h2>
                <SidebarSearch value={searchTerm} onChange={v => setSearchTerm(v)} />
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => dispatch(setShowCreateModal(true))}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium"
                    >
                        + Tạo nhóm
                    </button>

                    <button
                        onClick={onAddFriend}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium"
                    >
                        + Thêm bạn
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filtered.map(c => (
                    <ContactItem key={c.id} contact={c} active={activeChat?.id === c.id} onClick={() => onSelect(c)} />
                ))}
            </div>
            {showCreateModal && <CreateRoomModal />}
        </div>
    );
}
