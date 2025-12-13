import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { chatSocketServer } from "../../services/socket";

const createSocketPromise = (action, payload, errorEvent = "ERROR") => {
  return new Promise((resolve, reject) => {
    const handler = (response) => {
      chatSocketServer.off(action, handler);
      chatSocketServer.off(errorEvent, handler);

      if (response.status === "success") resolve(response.data);
      else reject(response.data || "Unknown error");
    };

    chatSocketServer.on(action, handler);
    chatSocketServer.on(errorEvent, handler);
    chatSocketServer.send(action, payload);
  });
};

export const getList = createAsyncThunk(
  "chat/getList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await createSocketPromise("GET_USER_LIST", {});
      return response;
    } catch (err) {
      return rejectWithValue(err || "Get list failed");
    }
  }
);

export const createRoom = createAsyncThunk(
  "chat/createRoom",
  async ({ name }, { rejectWithValue }) => {
    try {
      const response = await createSocketPromise("CREATE_ROOM", { name });
      return response;
    } catch (err) {
      return rejectWithValue(err || "Create room failed");
    }
  }
);

export const joinRoom = createAsyncThunk(
  "chat/joinRoom",
  async ({ name }, { rejectWithValue }) => {
    try {
      const response = await createSocketPromise("JOIN_ROOM", { name });
      return response;
    } catch (err) {
      return rejectWithValue(err || "Join room failed");
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

        const raw = Array.isArray(action.payload) ? action.payload : [];
        state.list = raw.map((item) => ({
          ...item,
          type: item.type === 1 ? "room" : "people",
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
        const room = { ...action.payload, type: "room" };
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
        const room = { ...action.payload, type: "room" };
        if (!state.list.find((c) => c.name === room.name))
          state.list.push(room);
        state.activeChatId = room.name;
        state.showJoinModal = false;
      })
      .addCase(joinRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setShowCreateModal, setShowJoinModal, setActiveChat } =
  listUserSlice.actions;
export default listUserSlice.reducer;
