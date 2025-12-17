import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { chatSocketServer } from "../../services/socket";

const createSocketPromise = (event, payload, errorEvent = "ERROR") => {
  return new Promise((resolve, reject) => {
    chatSocketServer
      .connect()
      .then(() => {
        const handler = (response) => {
          chatSocketServer.off(event, handler);
          chatSocketServer.off(errorEvent, handler);

          if (response?.status === "success") resolve(response.data);
          else reject(response?.data || "Unknown error");
        };

        chatSocketServer.on(event, handler);
        chatSocketServer.on(errorEvent, handler);
        chatSocketServer.send(event, payload);
      })
      .catch(reject);
  });
};


export const initSocket = createAsyncThunk("auth/initSocket", async () => {
  await chatSocketServer.connect();
});

export const registerUser = createAsyncThunk(
  "auth/register",
  async ({ user, pass }, { rejectWithValue }) => {
    try {
      chatSocketServer.send("REGISTER", { user, pass });
      return { user };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ user, pass }, { rejectWithValue }) => {
    try {
      const responseData = await createSocketPromise("LOGIN", { user, pass });

      return {
        user,
        code: responseData?.RE_LOGIN_CODE,
      };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const reLoginUser = createAsyncThunk(
  "auth/reLogin",
  async ({ user, code }, { rejectWithValue }) => {
    try {
      const responseData = await createSocketPromise("RE_LOGIN", {
        user,
        code,
      });

      return {
        user,
        code: responseData?.RE_LOGIN_CODE ?? code,
      };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    isAuthenticated: false,
    user: null,
    reLoginCode: null,
    status: "idle",
    error: null,
  },
  reducers: {
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.reLoginCode = null;

      localStorage.removeItem("user");
      localStorage.removeItem("reLoginCode");

      chatSocketServer.send("LOGOUT", {});
      chatSocketServer.setAuthed(false);
      chatSocketServer.close();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.reLoginCode = action.payload.code;

        localStorage.setItem("user", action.payload.user);
        if (action.payload.code) {
          localStorage.setItem("reLoginCode", action.payload.code);
        }
        chatSocketServer.setAuthed(true);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Login failed";
        chatSocketServer.setAuthed(false);
      })

      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "idle";
        alert(
          `Đăng ký thành công cho tài khoản ${action.payload.user}. Vui lòng đăng nhập.`
        );
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Registration failed";
      })

      .addCase(reLoginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(reLoginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.reLoginCode = action.payload.code;

        localStorage.setItem("user", action.payload.user);
        if (action.payload.code) {
          localStorage.setItem("reLoginCode", action.payload.code);
        }
        chatSocketServer.setAuthed(true);
      })
      .addCase(reLoginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Re-login failed";
        chatSocketServer.setAuthed(false);
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
