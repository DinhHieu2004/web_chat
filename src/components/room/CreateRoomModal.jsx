import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {createRoom, setShowCreateModal, setShowJoinModal} from '../../redux/slices/listUserSlice';

export default function CreateRoomModal() {
    const dispatch = useDispatch();
    const { loading } = useSelector(state => state.listUser);
    const [roomName, setRoomName] = useState('');
    const [error, setError] = useState('');

    const handleCreate = () => {
        if (!roomName.trim()) {
            setError('Vui lòng nhập tên phòng');
            return;
        }
        setError('');
        dispatch(createRoom({ name: roomName.trim() }));
    };

    const switchToJoin = () => {
        dispatch(setShowCreateModal(false));
        dispatch(setShowJoinModal(true));
    };

    const handleClose = () => {
        dispatch(setShowCreateModal(false));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-tittle">Tạo Phòng</h2>

                <input type="text" placeholder="Tên phòng" value={roomName} onChange={e => {
                    setRoomName(e.target.value);
                    if (error) setError('');
                }}
                       className={`w-full border px-3 py-2 rounded mb-1 ${
                           error ? 'border-red-500' : ''
                       }`}
                />

                {error && (
                    <p className="text-red-500 text-sm mb-3">{error}</p>
                )}

                <div className="flex justify-between items-center">
                    <button onClick={switchToJoin} className="text-blue-600 text-sm hover:underline">Đã có phòng? Tham gia</button>

                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                        <button onClick={handleCreate} disabled={loading} className={`px-4 py-2 rounded text-white ${
                                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {loading ? 'Đang tạo...' : 'Tạo'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
