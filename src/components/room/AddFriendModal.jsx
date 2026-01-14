import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    chatFriend,
    setShowAddFriendModal,
} from "../../redux/slices/listUserSlice";

export default function AddFriendModal() {
    const dispatch = useDispatch();
    const { loading } = useSelector((state) => state.listUser);

    const [friendName, setFriendName] = useState("");
    const [error, setError] = useState("");

    const handleAdd = () => {
        if (!friendName.trim()) {
            setError("Vui lòng nhập tên người dùng");
            return;
        }

        setError("");
        dispatch(chatFriend({ user: friendName.trim() }));
    };

    const handleClose = () => {
        dispatch(setShowAddFriendModal(false));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                <h2 className="text-xl font-bold mb-4">Nhắn tin với bạn</h2>

                <input
                    type="text"
                    placeholder="Tên người dùng"
                    value={friendName}
                    onChange={(e) => {
                        setFriendName(e.target.value);
                        if (error) setError("");
                    }}
                    className={`w-full border px-3 py-2 rounded mb-1 ${
                        error ? "border-red-500" : ""
                    }`}
                />

                {error && (
                    <p className="text-red-500 text-sm mb-3">{error}</p>
                )}

                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-gray-200 rounded"
                    >
                        Hủy
                    </button>

                    <button
                        onClick={handleAdd}
                        disabled={loading}
                        className={`px-4 py-2 rounded text-white ${
                            loading
                                ? "bg-blue-400"
                                : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {loading ? "Đang mở..." : "Nhắn tin"}
                    </button>
                </div>
            </div>
        </div>
    );
}
