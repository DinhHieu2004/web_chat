// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        // Thêm các reducers khác (ví dụ: chat, users) ở đây
    },
    // Middleware để cho phép Redux xử lý các đối tượng không thể serializable như WebSocket object
    // Mặc dù ta đã tách socket ra khỏi state, việc này vẫn nên làm.
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});