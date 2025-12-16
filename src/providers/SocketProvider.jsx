import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { initSocket } from "../redux/slices/authSlice";

export default function SocketProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initSocket());
  }, [dispatch]);

  return children;
}
