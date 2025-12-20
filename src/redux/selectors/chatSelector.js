export const selectActiveChatKey = (state) =>
  state.chat.activeChatKey;

export const selectMessagesByChatKey = (chatKey) => (state) =>
  state.chat.messagesMap[chatKey] || [];
