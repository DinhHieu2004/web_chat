import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createRoom, setShowCreateModal } from '../../redux/slices/roomSlice';

export default function CreateRoomModal() {
    const dispatch = useDispatch();
    const { loading } = useSelector(state => state.room);
    const [roomName, setName] = useState('');

    const handleCreate = () => {
        if (!roomName.trim()) {
            alert('Vui lòng nhập tên Nhóm');
            return;
        }
        dispatch(createRoom({ name: roomName.trim() }));
    };

    const handleClose = () => {
        dispatch(setShowCreateModal(false));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                <h2 className="text-xl font-bold mb-4">Tạo Nhóm</h2>
                <input
                    type="text"
                    placeholder="Tên Nhóm"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border px-3 py-2 rounded mb-4 focus:outline-none focus:ring focus:border-blue-300"
                />
                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleCreate}
                        className={`px-4 py-2 rounded text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        disabled={loading}
                    >
                        {loading ? 'Đang tạo...' : 'Tạo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
