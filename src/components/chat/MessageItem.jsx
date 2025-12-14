import React from "react";
import { FaUserCircle } from "react-icons/fa";

export default function MessageItem({ msg }) {
  const isMe = msg.sender === "user";

  return (
    <div className={`flex mb-4 ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe && (
        <div className="mr-3 mt-1">
          <FaUserCircle size={36} className="text-gray-400" />
        </div>
      )}

      <div className="max-w-[70%]">
        <div
          className={`text-xs text-gray-500 mb-1 ${
            isMe ? "text-right" : "text-left"
          }`}
        >
          {isMe ? "Bạn" : msg.from} - {msg.time}
        </div>

        <div
          className={`px-4 py-2 rounded-lg ${
            isMe
              ? "bg-linear-to-r from-purple-500 to-blue-500 text-white"
              : "bg-gray-100 text-gray-900"
          }`}
        >
          <p className="text-sm break-words whitespace-pre-wrap">
            {msg.text}
          </p>
        </div>
      </div>
    </div>
  );
}
