import React from 'react';
import { Users, MoreVertical } from 'lucide-react';
import { FaCircle } from 'react-icons/fa';

export default function ChatHeader({ activeChat }) {
    return (
        <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-linear-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-xl">
                    {activeChat?.avatar}
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        {activeChat?.name}
                        {activeChat?.type === 'group' && (
                            <Users size={16} className="text-gray-500" />
                        )}
                    </h1>

                    {activeChat?.type === 'group' ? (
                        <p className="text-sm text-gray-500">
                            {activeChat?.members} thành viên
                        </p>
                    ) : (
                        <p className="text-sm flex items-center gap-1">
                            <FaCircle size={10} className={activeChat?.online ? 'text-green-500' : 'text-gray-400'}/>
                            {activeChat?.online ? 'Online' : 'Offline'}
                        </p>
                    )}
                </div>
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreVertical size={20} className="text-gray-600" />
            </button>
        </div>
    );
}
