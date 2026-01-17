import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messagesMap: {},
  activeChatKey: null,
};
const ensureChat = (state, chatKey) => {
  if (!state.messagesMap[chatKey]) {
    state.messagesMap[chatKey] = {
      messages: [],
      page: 0,
      hasMore: true,
    };
  }
};
const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChat(state, action) {
      state.activeChatKey = action.payload;
    },

    initChat(state, action) {
      ensureChat(state, action.payload);
    },

    addMessage(state, action) {
      const { chatKey, message } = action.payload;
      ensureChat(state, chatKey);
      const chat = state.messagesMap[chatKey];
      const arr = chat.messages;

      const key = String(message.id);
      const idx = arr.findIndex((m) => String(m.id) === key);

      if (idx !== -1) {
        const prev = arr[idx];
        if (prev?.optimistic && !message?.optimistic) {
          arr[idx] = { ...prev, ...message, optimistic: false };
        }

        if (chat.recalledIds?.[key]) {
          arr[idx] = {
            ...arr[idx],
            recalled: true,
            text: "",
            url: null,
            fileName: null,
            blocks: [],
            poll: null,
          };
        }
        return;
      }
      const next = { ...message };

      if (chat.recalledIds?.[key]) {
        next.recalled = true;
        next.text = "";
        next.url = null;
        next.fileName = null;
        next.blocks = [];
        next.poll = null;
      }

      arr.push(next);
    },

    clearChat(state, action) {
      delete state.messagesMap[action.payload];
    },
    resetMessages(state, action) {
      const chatKey = action.payload;
      state.messagesMap[chatKey] = {
        messages: [],
        page: 0,
        hasMore: true,
        recalledIds: {},
      };
    },
    setHistory(state, action) {
      const { chatKey, messages, page } = action.payload;
      ensureChat(state, chatKey);
      const chat = state.messagesMap[chatKey];
      if (page < chat.page) return;

      const incoming = Array.isArray(messages) ? messages : [];

      if (incoming.length === 0) {
        chat.hasMore = false;
        return;
      }

      const existingIds = new Set(chat.messages.map((m) => String(m.id)));
      const uniqueIncoming = incoming.filter(
        (m) => m?.id && !existingIds.has(String(m.id)),
      );
      const sorted = uniqueIncoming.sort((a, b) => a.actionTime - b.actionTime);
      if (page === 1) {
        chat.messages = sorted;
      } else {
        chat.messages = [...sorted, ...chat.messages];
      }

      chat.page = page;
      chat.hasMore = true;
    },
    removeMessage(state, action) {
      const { chatKey, id } = action.payload;
      const arr = state.messagesMap[chatKey]?.messages;
      if (!arr) return;
      state.messagesMap[chatKey].messages = arr.filter((m) => String(m.id) !== String(id));
    },

    recallMessage(state, action) {
      const { chatKey, id } = action.payload;
      ensureChat(state, chatKey);

      const chat = state.messagesMap[chatKey];
      const key = String(id);

      chat.recalledIds ??= {};
      chat.recalledIds[key] = true;

      const arr = chat.messages;
      const idx = arr.findIndex((m) => String(m.id) === key);
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
      ensureChat(state, chatKey);
      const arr = state.messagesMap[chatKey].messages;
      if (arr.some((m) => m?.id === newMessage.id)) return;
      const safeIndex = Math.max(
        0,
        Math.min(typeof index === "number" ? index : arr.length, arr.length),
      );
      arr.splice(safeIndex, 0, newMessage);
    },

    toggleReaction(state, action) {
      const { chatKey, messageId, emoji, user } = action.payload;

      const messages = state.messagesMap?.[chatKey]?.messages;
      if (!messages) return;

      const msg = messages.find((m) => String(m.id) === String(messageId));
      if (!msg) return;

      msg.reactions ??= {};

      const normalizedUser =
        typeof user === "string" && user.startsWith("user:")
          ? user
          : `user:${user}`;

      const prevEmoji = Object.keys(msg.reactions).find((e) =>
        msg.reactions[e]?.includes(normalizedUser),
      );

      if (prevEmoji === emoji) {
        msg.reactions[emoji] = msg.reactions[emoji].filter(
          (u) => u !== normalizedUser,
        );
        if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
        return;
      }

      if (prevEmoji && prevEmoji !== emoji) {
        msg.reactions[prevEmoji] = msg.reactions[prevEmoji].filter(
          (u) => u !== normalizedUser,
        );
        if (msg.reactions[prevEmoji].length === 0)
          delete msg.reactions[prevEmoji];
      }

      msg.reactions[emoji] ??= [];
      msg.reactions[emoji].push(normalizedUser);
    },

    updateMessage(state, action) {
      const { chatKey, messageId, updates } = action.payload;
      const messages = state.messagesMap[chatKey];
      if (!messages) return;

      const msgIndex = messages.messages.findIndex(
        (m) => String(m.id) === String(messageId),
      );
      if (msgIndex === -1) return;

      messages[msgIndex] = {
        ...messages[msgIndex],
        ...updates,
      };
    },

    updatePollVote(state, action) {
      const {
        chatKey,
        pollId,
        optionId,
        userId,
        action: voteAction,
      } = action.payload;

      const messages = state.messagesMap[chatKey];
      if (!messages) {
        return;
      }

      const msgIndex = messages.findIndex((m) => {
        if (m.type !== "poll" || !m.poll) return false;

        return (
          m.poll.pollId === pollId || m.poll.id === pollId || m.id === pollId
        );
      });

      if (msgIndex === -1) {
        return;
      }

      const currentMsg = messages[msgIndex];

      const newPoll = JSON.parse(JSON.stringify(currentMsg.poll));

      const normalizedUserId =
        typeof userId === "string" && userId.startsWith("user:")
          ? userId
          : `user:${userId}`;

      console.log("👤 User ID normalized:", normalizedUserId);

      if (!newPoll.allowMultiple && voteAction === "add") {
        newPoll.options.forEach((opt) => {
          if (opt.voters?.includes(normalizedUserId)) {
            opt.voters = opt.voters.filter((v) => v !== normalizedUserId);
          }
        });
      }

      const targetOption = newPoll.options.find((opt) => opt.id === optionId);

      if (!targetOption) {
        return;
      }

      if (!targetOption.voters) targetOption.voters = [];

      if (voteAction === "add") {
        if (!targetOption.voters.includes(normalizedUserId)) {
          targetOption.voters.push(normalizedUserId);
        }
      } else if (voteAction === "remove") {
        const beforeLength = targetOption.voters.length;
        targetOption.voters = targetOption.voters.filter(
          (v) => v !== normalizedUserId,
        );
      }

      newPoll.options.forEach((opt) => {
        const total = opt.voters ? opt.voters.length : 0;
        opt.votes = total;
        opt.count = total;
      });

      newPoll.totalVotes = newPoll.options.reduce(
        (sum, opt) => sum + (opt.votes || 0),
        0,
      );

      messages[msgIndex] = {
        ...currentMsg,
        poll: newPoll,
      };

      // state.messagesMap[chatKey] = [...messages];
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
  updateMessage,
  updatePollVote,
  resetMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
