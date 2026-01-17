import {createSlice, createAsyncThunk} from "@reduxjs/toolkit";
import {chatSocketServer} from "../../services/socket";

const createSocketPromise = (event, payload, errorEvent = "ERROR") => {
    return new Promise((resolve, reject) => {
        const handler = (response) => {
            chatSocketServer.off(event, handler);
            chatSocketServer.off(errorEvent, handler);

            if (response?.status === "success") resolve(response.data);
            else reject(response?.data || "Unknown error");
        };

        chatSocketServer.on(event, handler);
        chatSocketServer.on(errorEvent, handler);
        chatSocketServer.send(event, payload);
    });
};

export const getList = createAsyncThunk(
    "chat/getList",
    async (_, {rejectWithValue}) => {
        try {
            return await createSocketPromise("GET_USER_LIST", {});
        } catch (err) {
            return rejectWithValue(err || "Get list failed");
        }
    }
);

export const createRoom = createAsyncThunk(
    "chat/createRoom",
    async ({name}, {rejectWithValue}) => {
        try {
            return await createSocketPromise("CREATE_ROOM", {name});
        } catch (err) {
            return rejectWithValue(err || "Create room failed");
        }
    }
);

export const joinRoom = createAsyncThunk(
    "chat/joinRoom",
    async ({name}, {rejectWithValue}) => {
        try {
            return await createSocketPromise("JOIN_ROOM", {name});
        } catch (err) {
            return rejectWithValue(err || "Join room failed");
        }
    }
);
export const chatFriend = createAsyncThunk(
    "chat/chatFriend",
    async ({user}, {rejectWithValue}) => {
        try {
            return await createSocketPromise("CHECK_USER_EXIST", {user});
        } catch (err) {
            return rejectWithValue(err || "Not exist");
        }
    }
);

const listUserSlice = createSlice({
    name: "user",
    initialState: {
        list: [],
        activeChatId: null,
        loading: false,
        error: null,
        showCreateModal: false,
        showJoinModal: false,
        showAddFriendModal: false,
    },
    reducers: {
        setShowCreateModal: (state, action) => {
            state.showCreateModal = action.payload;
        },
        setShowJoinModal: (state, action) => {
            state.showJoinModal = action.payload;
        },
        setShowAddFriendModal: (state, action) => {
            state.showAddFriendModal = action.payload;
        },
        setActiveChat: (state, action) => {
            state.activeChatId = action.payload;
        },
        setListUser: (state, action) => {
            const user = action.payload;
            const index = state.list.findIndex(c => c.name === user.name);
            let newList = [...state.list];

            const increaseUnread = user.increaseUnread === true;
            const noReorder = user.noReorder === true && !user.lastMessage;

            if (index !== -1) {
                const old = newList[index];

                newList[index] = {
                    ...old,
                    ...user,
                    unreadCount: increaseUnread
                        ? (old.unreadCount || 0) + 1
                        : increaseUnread === false
                            ? 0
                            : old.unreadCount
                };

                if (!noReorder) {
                    newList.unshift(newList.splice(index, 1)[0]);
                }
            } else {
                newList.unshift({
                    ...user,
                    unreadCount: increaseUnread ? 1 : 0
                });
            }

            state.list = newList;
        },
        clearError(state) {
            state.error = null;
        },

        setUserOnlineStatus: (state, action) => {
            const { name, online } = action.payload || {};
            const index = state.list.findIndex((c) => c.name === name);
            if (index !== -1) {
                state.list[index].online = !!online;
            }
        },

    },
    extraReducers: (builder) => {
        builder
            .addCase(getList.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getList.fulfilled, (state, action) => {
                state.loading = false;

                const raw = Array.isArray(action.payload) ? action.payload : [];
                state.list = raw.map((item) => ({
                    ...item,
                    type: item.type === 1 ? "room" : "people",
                    online: !!item.online,
                }));
            })
            .addCase(getList.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(createRoom.pending, (state) => {
                state.loading = true;
                state.error = null;
            })

            .addCase(createRoom.fulfilled, (state, action) => {
                state.loading = false;
                const room = {...action.payload, type: "room", online: !!action.payload?.online};
                if (!state.list.find((c) => c.name === room.name))
                    state.list.unshift(room);
                state.activeChatId = room.name;
                state.showCreateModal = false;
            })

            .addCase(createRoom.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(joinRoom.pending, (state) => {
                state.loading = true;
                state.error = null;
            })

            .addCase(joinRoom.fulfilled, (state, action) => {
                state.loading = false;
                const room = {...action.payload, type: "room", online: !!action.payload?.online};
                if (!state.list.find((c) => c.name === room.name))
                    state.list.unshift(room);
                state.activeChatId = room.name;
                state.showJoinModal = false;
            })
            .addCase(joinRoom.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(chatFriend.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(chatFriend.fulfilled, (state, action) => {
                state.loading = false;
                const isExist = action.payload?.status === true

                if (!isExist) {
                    state.error = "User không tồn tại";
                    return;
                }
                const username =
                    action.payload?.user ||
                    action.meta?.arg?.user;
                const people = {
                    name: username,
                    type: "people",
                    online: !!action.payload.online,
                    unreadCount: 0,
                    lastMessage: "",
                };

                if (!state.list.find(u => u.name === people.name)) {
                    state.list.unshift(people);
                }
                state.activeChatId = people.name;
                state.showAddFriendModal = false;
            })
            .addCase(chatFriend.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {setShowCreateModal, setListUser, setShowJoinModal, setActiveChat, setUserOnlineStatus, setShowAddFriendModal, clearError} = listUserSlice.actions;
export default listUserSlice.reducer;
