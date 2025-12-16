import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getList, setActiveChat, setListUser } from "../redux/slices/listUserSlice";
import { chatSocketServer } from "../services/socket";

export default function useSidebarLogic(searchTerm, onSelectContact) {
    const dispatch = useDispatch();
    const { list, activeChatId } = useSelector((state) => state.listUser);
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const bootedRef = useRef(false);

    useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;
        if (isAuthenticated) {
            dispatch(getList());
        }
    }, [dispatch, isAuthenticated]);

    useEffect(() => {
        if (!user) return;

        const onChat = (payload) => {
            console.log(payload);
            const d = payload?.data?.data || payload?.data || payload || {};
            const { type, name, to, mes } = d;
            if (!mes) return;
            console.log(d);
            const key = type === "room" ? to : name === user ? to : name;
            console.log(key);
            if (!key) return;

            dispatch(setListUser({
                name: key,
                lastMessage: mes,
                actionTime: Date.now(),
                type: type === 1 ? "room" : "people",
            }));
        };

        chatSocketServer.on("SEND_CHAT", onChat);

        return () => {
            chatSocketServer.off("SEND_CHAT", onChat);
        };
    }, [user, dispatch]);

    const filtered = useMemo(() => {
        return list.filter((c) => (c.name || "").toLowerCase().includes((searchTerm || "").toLowerCase()));
    }, [list, searchTerm]);

    const handleSelect = (item) => {
        dispatch(setActiveChat(item.name));
        onSelectContact?.(item);
    };

    return {list, filtered, activeChatId, handleSelect,};
}
