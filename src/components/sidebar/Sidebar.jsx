import React, {useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import SidebarSearch from './SidebarSearch';
import ContactItem from './ContactItem';
import { getList, setShowCreateModal, setActiveChat } from '../../redux/slices/listUserSlice';
import CreateRoomModal from '../room/CreateRoomModal';

export default function Sidebar({searchTerm, setSearchTerm}) {
    const dispatch = useDispatch();
    const {list, activeChatId, showCreateModal} = useSelector(state => state.listUser);
    useEffect(() => {
        dispatch(getList());
    }, [dispatch]);

    const filtered = list.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelect = (item) => {
        dispatch(setActiveChat(item.id));
    };

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Tin nhắn</h2>
                <SidebarSearch value={searchTerm} onChange={v => setSearchTerm(v)}/>
                <div className="gap-2 mt-3">
                    <button
                        onClick={() => dispatch(setShowCreateModal(true))}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium p-2">
                        + Tạo nhóm
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filtered.map(c => (
                    <ContactItem key={c.name} contact={c} active={activeChatId === c.name} onClick={() => handleSelect(c)}
                    />
                ))}
            </div>
            {showCreateModal && <CreateRoomModal/>}
        </div>
    );
}
