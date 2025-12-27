import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getList, setActiveChat, setListUser, setUserOnlineStatus } from "../redux/slices/listUserSlice";
import { chatSocketServer } from "../services/socket";
import { tryParseCustomPayload } from "../utils/chatDataFormatter.js";

export default function useSidebarLogic(searchTerm, onSelectContact) {
    const dispatch = useDispatch();
    const { list, activeChatId } = useSelector((state) => state.listUser);
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const bootedRef = useRef(false);

    const getSidebarPreview = (mes) => {
        const parsed = tryParseCustomPayload(
            typeof mes === "string" ? mes : mes?.mes
        );

        if (!parsed) {
            return typeof mes === "string" ? mes : "";
        }
        const { type, text, fileName } = parsed;

        if (["image", "video", "gif", "sticker", "audio"].includes(type)) {
            return `[${type.toUpperCase()}]`;
        }
        if (type === "file") return fileName || "[File]";
        if (type === "richText") return text;
    };
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
            const d = payload?.data?.data || payload?.data || payload || {};
            const { type, name, to, mes } = d;
            if (!mes) return;
            const key = type === "room" ? to : name === user ? to : name;
            if (!key) return;
            const preview = getSidebarPreview(mes);
            dispatch(setListUser({
                name: key,
                lastMessage: preview,
                actionTime: Date.now(),
                type: type === 1 ? "room" : "people",
            }));
        };

        chatSocketServer.on("SEND_CHAT", onChat);

        return () => {
            chatSocketServer.off("SEND_CHAT", onChat);
        };
    }, [user, dispatch]);

    // Presence handling: support both server-push (with username) and request/response
    // We'll also implement a sequential checker that queries the server for each user
    // (one at a time) so we can match responses even if the server does not echo the username.
    const seqResolverRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        const onCheckOnline = (payload) => {
            // payload shape might be: { status: 'success', data: { status: false }, event: 'CHECK_USER_ONLINE' }
            // or might include the user: { status: 'success', data: { user: 'ti', status: true }, event: 'CHECK_USER_ONLINE' }
            const p = payload || {};
            const body = p.data || p;

            const explicitUser = body?.user || body?.name;
            const statusVal = typeof body?.status !== "undefined" ? body.status : typeof body?.data?.status !== "undefined" ? body.data.status : undefined;

            if (explicitUser) {
                dispatch(setUserOnlineStatus({ name: explicitUser, online: !!statusVal }));
                return;
            }

            // No explicit user: treat this as the response to the sequential request
            if (seqResolverRef.current) {
                seqResolverRef.current(!!statusVal);
                seqResolverRef.current = null;
            }
        };

        // chatSocketServer.on("CHECK_USER_ONLINE", onCheckOnline);

        return () => {
            // chatSocketServer.off("CHECK_USER_ONLINE", onCheckOnline);
            seqResolverRef.current = null;
        };
    }, [user, dispatch]);

    // When the list changes, perform sequential checks for non-room users
    useEffect(() => {
        if (!user || !Array.isArray(list) || list.length === 0) return;

        let cancelled = false;

        const runSequentialChecks = async () => {
            for (const item of list) {
                if (cancelled) break;
                if (item.type === "room") continue;

                // Skip if the user is already marked online to reduce requests
                // (you can remove this check if you want fresh info every time)
                // if (item.online) continue;

                const online = await new Promise((resolve) => {
                    // Install resolver and send request. If no response within timeout, assume offline.
                    seqResolverRef.current = (val) => resolve(!!val);
                    try {
                        // chatSocketServer.send("CHECK_USER_ONLINE", { user: item.name });
                    } catch (e) {
                        seqResolverRef.current = null;
                        resolve(false);
                        return;
                    }

                    const t = setTimeout(() => {
                        if (seqResolverRef.current) {
                            seqResolverRef.current = null;
                            resolve(false);
                        }
                    }, 2500);
                });

                if (cancelled) break;
                dispatch(setUserOnlineStatus({ name: item.name, online }));

                // Short delay between requests to avoid spamming server
                await new Promise((r) => setTimeout(r, 150));
            }
        };

        runSequentialChecks();

        return () => {
            cancelled = true;
            seqResolverRef.current = null;
        };
    }, [list, user, dispatch]);

    const filtered = useMemo(() => {
        return list.filter((c) => (c.name || "").toLowerCase().includes((searchTerm || "").toLowerCase()));
    }, [list, searchTerm]);

    const handleSelect = (item) => {
        dispatch(setActiveChat(item.name));
        onSelectContact?.(item);
    };

    return {list, filtered, activeChatId, handleSelect,};
}
