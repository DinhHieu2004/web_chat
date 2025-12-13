import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chatSocketServer } from '../../services/socket';


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


export const registerUser = createAsyncThunk(
    'auth/register',
    async ({ user, pass }, { rejectWithValue }) => {
        try {
          
            chatSocketServer.send('REGISTER', { user, pass });
            return { user }; 
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const loginUser = createAsyncThunk(
    'auth/login',
    async ({ user, pass }, { rejectWithValue }) => {
        try {
            const responseData = await createSocketPromise('LOGIN', { user, pass }, 'LOGIN');
         
           return { 
                user: user,
                code: responseData.RE_LOGIN_CODE 
            };
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const reLoginUser = createAsyncThunk(
    'auth/reLogin',
    async ({ user, code }, { rejectWithValue }) => {
        try {

            const responseData= await createSocketPromise('RE_LOGIN', { user, code }, 'RE_LOGIN');
            return {
                user,
                code: responseData.RE_LOGIN_CODE
            };
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);
export const initSocket = createAsyncThunk(
    'auth/initSocket',
    async () => {
        await chatSocketServer.connect();
    }
);


const authSlice = createSlice({
    name: 'auth',
    initialState: {
        isAuthenticated: false,
        user: null,
        reLoginCode: null, 
        status: 'idle',
        error: null,
    },
    reducers: {
        logout(state) {
            state.isAuthenticated = false;
            state.user = null;
            state.reLoginCode = null;
            localStorage.removeItem('user');
            localStorage.removeItem('reLoginCode');
            chatSocketServer.send('LOGOUT', {});
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.reLoginCode = action.payload.code;
                localStorage.setItem('reLoginCode', action.payload.code);
                localStorage.setItem('user', action.payload.user);
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Login failed';
            })
            
            .addCase(registerUser.pending, (state) => {
                 state.status = 'loading';
                 state.error = null;
            })
            .addCase(registerUser.fulfilled, (state) => {
                 state.status = 'idle'; 
                 alert(`Đăng ký thành công cho tài khoản ${state.user}. Vui lòng đăng nhập.`);
            })
            .addCase(registerUser.rejected, (state, action) => {
                 state.status = 'failed';
                 state.error = action.payload || 'Registration failed';
            })
            
            .addCase(reLoginUser.fulfilled, (state, action) => {
                 state.status = 'succeeded';
                 state.isAuthenticated = true;
                 state.user = action.payload.user;
                 state.reLoginCode = action.payload.code;
                 localStorage.setItem('user', action.payload.user);
                 localStorage.setItem('reLoginCode', action.payload.code);
            });
    },
});

export const { logout} = authSlice.actions;

export default authSlice.reducer;