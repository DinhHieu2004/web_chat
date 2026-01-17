export const selectActiveChatKey = (state) =>
    state.chat.activeChatKey;

export const selectChatByKey = (state, chatKey) =>
    state.chat.messagesMap[chatKey] ?? {
        messages: [],
        page: 0,
        hasMore: true,
    };

export const selectMessagesByChatKey = (chatKey) => (state) =>
    selectChatByKey(state, chatKey).messages;

export const selectHasMoreByChatKey = (chatKey) => (state) =>
    selectChatByKey(state, chatKey).hasMore;

export const selectPageByChatKey = (chatKey) => (state) =>
    selectChatByKey(state, chatKey).page;

