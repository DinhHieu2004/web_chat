import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { joinRoom, setShowJoinModal, setShowCreateModal } from '../../redux/slices/listUserSlice';

export default function JoinRoomModal() {
    const dispatch = useDispatch();
    const { loading } = useSelector(state => state.listUser);
    const [roomName, setRoomName] = useState('');

    const handleJoin = () => {
        if (!roomName.trim()) {
            alert('Vui lòng nhập mã phòng');
            return;
        }
        dispatch(joinRoom({ name: roomName.trim() }));
    };

    const switchToCreate = () => {
        dispatch(setShowJoinModal(false));
        dispatch(setShowCreateModal(true));
    };

    const handleClose = () => {
        dispatch(setShowJoinModal(false));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                <h2 className="text-xl font-bold mb-4">Tham Gia Nhóm</h2>

                <input type="text" placeholder="Mã phòng" value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    className="w-full border px-3 py-2 rounded mb-4"/>

                <div className="flex justify-between items-center">
                    <button onClick={switchToCreate} className="text-blue-600 text-sm hover:underline">+ Tạo nhóm mới</button>

                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                        <button onClick={handleJoin} disabled={loading} className={`px-4 py-2 rounded text-white ${
                                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {loading ? 'Đang vào...' : 'Vào nhóm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
