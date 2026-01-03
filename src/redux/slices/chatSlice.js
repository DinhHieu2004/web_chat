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
    removeMessage(state, action) {
      const { chatKey, id } = action.payload;
      const arr = state.messagesMap[chatKey];
      if (!arr) return;
      state.messagesMap[chatKey] = arr.filter((m) => m.id !== id);
    },

    recallMessage(state, action) {
      const { chatKey, id } = action.payload;
      const arr = state.messagesMap[chatKey];
      if (!arr) return;
      const idx = arr.findIndex((m) => m.id === id);
      if (idx === -1) return;

      arr[idx] = {
        ...arr[idx],
        recalled: true,
        text: "",
        url: null,
        fileName: null,
        blocks: [],
        poll: null,
        rawMes: arr[idx].rawMes || arr[idx].mes || "",
        type: arr[idx].type || "text",
      };
    },
  },
});

export const { setActiveChat, initChat, addMessage, clearChat, setHistory, removeMessage, recallMessage } =
  chatSlice.actions;

export default chatSlice.reducer;
