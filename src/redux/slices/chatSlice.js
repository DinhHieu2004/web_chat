import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messagesMap: {},     
  activeChatKey: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChat(state, action) {
      state.activeChatKey = action.payload;
    },

    initChat(state, action) {
      const chatKey = action.payload;
      if (!state.messagesMap[chatKey]) {
        state.messagesMap[chatKey] = [];
      }
    },

    addMessage(state, action) {
      const { chatKey, message } = action.payload;
      if (!state.messagesMap[chatKey]) {
        state.messagesMap[chatKey] = [];
      }
      state.messagesMap[chatKey].push(message);
    },

    clearChat(state, action) {
      delete state.messagesMap[action.payload];
    },
    setHistory(state, action) {
      const { chatKey, messages } = action.payload;
      state.messagesMap[chatKey] = messages;
    },
  },
});

export const {
  setActiveChat,
  initChat,
  addMessage,
  clearChat,
  setHistory,
} = chatSlice.actions;

export default chatSlice.reducer;
