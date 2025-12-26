import React from "react";
import { FaUser, FaUsers } from "react-icons/fa";
import { formatRelativeTime } from "../../utils/Time";

export default function ContactItem({ contact, active, onClick }) {
  const isRoom = contact.type === "room";
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 flex items-center gap-3 cursor-pointer
        hover:bg-gray-50
        ${active ? "bg-purple-50 border-l-4 border-purple-500" : ""}
      `}
    >
      <div className="relative">
        <div
          className="w-10 h-10 bg-linear-to-br from-purple-400 to-blue-400
                     rounded-full flex items-center justify-center text-white"
        >
          {isRoom ? <FaUsers size={16} /> : <FaUser size={16} />}
        </div>
        {contact.online && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-800 truncate">
          {contact.name}
        </h3>

        {contact.lastMessage && (
          <p className="text-sm text-gray-500 truncate">
            {contact.lastMessage}
          </p>
        )}
      </div>
        {contact.actionTime && (
            <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                {formatRelativeTime(contact.actionTime)}
            </div>
        )}
    </div>
  );
}
