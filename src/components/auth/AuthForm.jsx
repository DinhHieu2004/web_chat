import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser, registerUser } from '../../redux/slices/authSlice';

export default function AuthForm() {
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const isLogin = location.pathname.includes('login') || location.pathname === '/chat/';

    const status = useSelector((state) => state.auth.status);
    const error = useSelector((state) => state.auth.error);
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const isLoading = status === 'loading';

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/chat/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isLoading) return;

        if (isLogin) {
            dispatch(loginUser({ user, pass }));
        } else {
            if (pass !== confirmPass) {
                alert("Mật khẩu không khớp");
                return;
            }
            dispatch(registerUser({ user, pass }));
        }
    };

    const changetAuthMode = () => {
        setConfirmPass('');
        if (isLogin) {
            navigate('/chat/register');
        } else {
            navigate('/chat/login');
        }
    }

    return (
        <div className="flex flex-col justify-center items-center h-screen bg-gray-100 px-4">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight">
                    <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-blue-500">
                        CHAT APP
                    </span>
                    <span className="text-gray-800 ml-2">GROUP 57</span>
                </h1>
            </div>

            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
                </h2>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 text-sm" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-1.5" htmlFor="username">
                            Tên người dùng
                        </label>
                        <input
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-50"
                            id="username"
                            type="text"
                            placeholder="Nhập tài khoản"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-1.5" htmlFor="password">
                            Mật khẩu
                        </label>
                        <input
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-50"
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {!isLogin && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-gray-700 text-sm font-semibold mb-1.5" htmlFor="confirmPassword">
                                Xác nhận mật khẩu
                            </label>
                            <input
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-50"
                                id="confirmPassword"
                                type="password"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPass}
                                onChange={(e) => setConfirmPass(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            className="w-full py-3 px-4 bg-linear-to-r from-blue-600 to-blue-500 hover:brightness-110 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Đang xử lý...' : isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            type="button"
                            onClick={changetAuthMode}
                        >
                            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập ngay'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}