// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import listUReducer from './slices/listUserSlice.js';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        listUser: listUReducer,
    },
    // Middleware để cho phép Redux xử lý các đối tượng không thể serializable như WebSocket object
    // Mặc dù ta đã tách socket ra khỏi state, việc này vẫn nên làm.
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});