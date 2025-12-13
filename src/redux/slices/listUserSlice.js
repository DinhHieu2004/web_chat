import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {chatSocketServer} from '../../services/socket';

const createSocketPromise = (action, payload, successEvent, errorEvent = 'ERROR') => {
    return new Promise((resolve, reject) => {
        const successHandler = (response) => {
            chatSocketServer.off(successEvent, successHandler);
            chatSocketServer.off(errorEvent, errorHandler);
            resolve(response.data);
        };

        const errorHandler = (response) => {
            chatSocketServer.off(successEvent, successHandler);
            chatSocketServer.off(errorEvent, errorHandler);
            reject(response.data);
        };

        chatSocketServer.on(successEvent, successHandler);
        chatSocketServer.on(errorEvent, errorHandler);

        chatSocketServer.send(action, payload);


    });
};

export const getList = createAsyncThunk('chat/getList',
    async (_, {
        rejectWithValue}) => {
    try {
        const response = await createSocketPromise('GET_USER_LIST', {}, 'GET_USER_LIST');
        return response;
    } catch (err) {
        return rejectWithValue(err || 'Get list failed');
    }
});

export const createRoom = createAsyncThunk('chat/createRoom',
    async ({name}, {rejectWithValue}) => {
    try {
        const response = await createSocketPromise('CREATE_ROOM', {name}, 'CREATE_ROOM');
        return response;
    } catch (err) {
        return rejectWithValue(err || 'Create room failed');
    }
});

export const joinRoom = createAsyncThunk('chat/joinRoom', async ({name}, {rejectWithValue}) => {
    try {
        const response = await createSocketPromise('JOIN_ROOM', {name}, 'JOIN_ROOM');
        return response;
    } catch (err) {
        return rejectWithValue(err || 'Join room failed');
    }
});

const listUserSlice = createSlice({
    name: 'user',
    initialState: {
        list: [],
        activeChatId: null,
        loading: false,
        error: null,
        showCreateModal: false,
        showJoinModal: false,
    },
    reducers: {
        setShowCreateModal: (state, action) => {
            state.showCreateModal = action.payload;
        },
        setShowJoinModal: (state, action) => {
            state.showJoinModal = action.payload;
        },
        setActiveChat: (state, action) => {
            state.activeChatId = action.payload;
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
                state.list = action.payload;
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
                if (!state.list.find(c => c.id === action.payload.id)) state.list.unshift(action.payload);
                state.activeChatId = action.payload.id;
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
                if (!state.list.find(c => c.id === action.payload.id)) state.list.push(action.payload);
                state.activeChatId = action.payload.id;
                state.showJoinModal = false;
            })
            .addCase(joinRoom.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {setShowCreateModal, setShowJoinModal, setActiveChat} = listUserSlice.actions;
export default listUserSlice.reducer;
