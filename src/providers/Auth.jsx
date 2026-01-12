import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { reLoginUser } from "../redux/slices/authSlice";
import { getList } from "../redux/slices/listUserSlice";

export default function AuthBootstrap({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, status } = useSelector((state) => state.auth);

    const bootedRef = useRef(false);

    useEffect(() => {
        if (bootedRef.current) return;

        const storedUser = localStorage.getItem("user");
        const storedCode = localStorage.getItem("reLoginCode");

        if (storedUser && storedCode && !isAuthenticated && status === "idle") {
            bootedRef.current = true;

            dispatch(reLoginUser({ user: storedUser, code: storedCode }))
                .unwrap()
                .then(() => dispatch(getList()))
                .catch(() => {
                    localStorage.clear();
                    navigate("/chat/login", { replace: true });
                });
        } else if (isAuthenticated) {
            bootedRef.current = true;
            dispatch(getList());
        }
    }, [dispatch, isAuthenticated, status, navigate]);

    useEffect(() => {
        if (!isAuthenticated && status !== "loading" && status !== "idle") {
            navigate("/chat/login", { replace: true });
        }
    }, [isAuthenticated, status, navigate]);

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center h-screen">
                Đang đăng nhập lại...
            </div>
        );
    }

    return children;
}