import React from "react";
import { FaUser, FaUsers } from "react-icons/fa";
import { MoreVertical } from "lucide-react";
import { FiSearch } from "react-icons/fi";
import { FiMoreVertical } from "react-icons/fi";

export default function ChatHeader({ activeChat, onOpenSearch }) {
  if (!activeChat) return null;

  const isRoom = activeChat.type === "room";

  return (
    <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 bg-linear-to-br from-purple-400 to-blue-400
                        rounded-full flex items-center justify-center text-white"
        >
          {isRoom ? <FaUsers size={18} /> : <FaUser size={18} />}
        </div>

        <h1 className="text-lg font-semibold text-gray-800">
          {activeChat.name}
        </h1>
      </div>

      <div className="flex items-center gap-2"> 
        <button
          type="button"
          onClick={() => onOpenSearch?.()}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Tìm kiếm trong trò chuyện"
        >
          <FiSearch size={18} className="text-gray-600" />
        </button>

        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Menu"
        >
          <FiMoreVertical size={18} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}
