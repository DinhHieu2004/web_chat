import React from 'react';
import SidebarSearch from './SidebarSearch';
import ContactItem from './ContactItem';


export default function Sidebar({contacts, activeChat, onSelect, searchTerm, setSearchTerm}) {
    const filtered = contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Tin nhắn</h2>
                <SidebarSearch value={searchTerm} onChange={(v) => setSearchTerm(v)}/>
            </div>


            <div className="flex-1 overflow-y-auto">
                {filtered.map(c => (
                    <ContactItem key={c.id} contact={c} active={activeChat?.id === c.id} onClick={() => onSelect(c)}/>
                ))}
            </div>
        </div>
    );
}