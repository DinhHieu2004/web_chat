// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import listUReducer from './slices/listUserSlice.js';
import chatReducer from "./slices/chatSlice.js";


export const store = configureStore({
    reducer: {
        auth: authReducer,
        listUser: listUReducer,
        chat: chatReducer,
    },

    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

