import React from "react";
import { Users, MoreVertical } from "lucide-react";

export default function ChatHeader({ activeChat }) {
  const isRoom = activeChat?.type === "room";

  const memberCount =
    activeChat?.members ??
    activeChat?.userList?.length ??
    null;

  const online =
    typeof activeChat?.online === "boolean"
      ? activeChat.online
      : null;

  return (
    <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-linear-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-xl">
          {activeChat?.avatar}
        </div>

        <div>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {activeChat?.name}
            {isRoom && <Users size={16} className="text-gray-500" />}
          </h1>

          {isRoom ? (
            <p className="text-sm text-gray-500">
              {memberCount === null
                ? "Phòng chat"
                : `${memberCount} thành viên`}
            </p>
          ) : (
            <p
              className={`text-sm ${
                online === false ? "text-gray-400" : "text-green-500"
              }`}
            >
              {online === null
                ? "● —"
                : online
                ? "● Online"
                : "● Offline"}
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
