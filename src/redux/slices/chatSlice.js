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
    insertMessageAt(state, action) {
      const { chatKey, index, message: newMessage } = action.payload || {};
      if (!chatKey || !newMessage?.id) return;
      if (!state.messagesMap[chatKey]) state.messagesMap[chatKey] = [];
      const arr = state.messagesMap[chatKey];
      if (arr.some((m) => m?.id === newMessage.id)) return;
      const safeIndex = Math.max(
        0,
        Math.min(typeof index === "number" ? index : arr.length, arr.length)
      );
      arr.splice(safeIndex, 0, newMessage);
    },

    toggleReaction(state, action) {
      const { chatKey, messageId, emoji, user } = action.payload;

      const messages = state.messagesMap?.[chatKey];
      if (!messages) return;

      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      if (!msg.reactions) msg.reactions = {};

      const normalizedUser =
        typeof user === "string" && user.startsWith("user:")
          ? user
          : `user:${user}`;

      const prevEmoji = Object.keys(msg.reactions).find((e) =>
        msg.reactions[e]?.includes(normalizedUser)
      );

      if (prevEmoji === emoji) {
        msg.reactions[emoji] = msg.reactions[emoji].filter(
          (u) => u !== normalizedUser
        );
        if (msg.reactions[emoji].length === 0) {
          delete msg.reactions[emoji];
        }
        return;
      }

      if (prevEmoji && prevEmoji !== emoji) {
        msg.reactions[prevEmoji] = msg.reactions[prevEmoji].filter(
          (u) => u !== normalizedUser
        );
        if (msg.reactions[prevEmoji].length === 0) {
          delete msg.reactions[prevEmoji];
        }
      }

      msg.reactions[emoji] ??= [];
      msg.reactions[emoji].push(normalizedUser);
    },
  },
});

export const {
  setActiveChat,
  initChat,
  addMessage,
  insertMessageAt,
  clearChat,
  setHistory,
  removeMessage,
  recallMessage,
  toggleReaction,
} = chatSlice.actions;

export default chatSlice.reducer;
