import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { reLoginUser } from "../redux/slices/authSlice";
import AuthForm from "../components/auth/AuthForm";

export default function AuthBootstrap({ children }) {
  const dispatch = useDispatch();
  const { isAuthenticated, status } = useSelector(
    (state) => state.auth
  );

  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const storedUser = localStorage.getItem("user");
    const storedCode = localStorage.getItem("reLoginCode");

    if (storedUser && storedCode && !isAuthenticated) {
      dispatch(
        reLoginUser({ user: storedUser, code: storedCode })
      );
    }
  }, [dispatch, isAuthenticated]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        Đang kết nối / Đăng nhập lại...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return children;
}
