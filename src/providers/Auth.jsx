import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { reLoginUser } from "../redux/slices/authSlice";
import AuthForm from "../components/auth/AuthForm";
import { getList } from "../redux/slices/listUserSlice";

export default function AuthBootstrap({ children }) {
  const dispatch = useDispatch();
  const { isAuthenticated, status } = useSelector(
    (state) => state.auth
  );

  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    
    const storedUser = localStorage.getItem("user");
    const storedCode = localStorage.getItem("reLoginCode");

    // Chỉ thử re-login nếu có đầy đủ thông tin và chưa authenticated
    if (storedUser && storedCode && !isAuthenticated && status === "idle") {
      bootedRef.current = true;
      
      console.log("Attempting re-login for user:", storedUser);
      
      dispatch(reLoginUser({ user: storedUser, code: storedCode }))
        .unwrap()
        .then(() => {
          console.log("Re-login successful, fetching user list");
          return dispatch(getList()).unwrap();
        })
        .then(() => {
          console.log("User list loaded successfully");
        })
        .catch((err) => {
          console.error("Re-login failed:", err);
          // Clear localStorage khi re-login thất bại
          localStorage.removeItem("user");
          localStorage.removeItem("reLoginCode");
        });
    } else if (isAuthenticated && !bootedRef.current) {
      // Nếu đã authenticated (có thể từ login thông thường), load danh sách
      bootedRef.current = true;
      dispatch(getList());
    }
  }, [dispatch, isAuthenticated, status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Đang kết nối / Đăng nhập lại...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return children;
}