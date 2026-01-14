import {useEffect, useMemo, useRef, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {
    getList,
    setActiveChat,
    setListUser,
    setUserOnlineStatus,
} from "../redux/slices/listUserSlice";
import {chatSocketServer} from "../services/socket";
import {tryParseCustomPayload} from "../utils/chatDataFormatter.js";

export default function useSidebarLogic(searchTerm, onSelectContact) {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState("all");
    const {list, activeChatId} = useSelector((state) => state.listUser);
    const {isAuthenticated, user} = useSelector((state) => state.auth);
    const bootedRef = useRef(false);

    const decodeEmojiFromCpsJson = (raw) => {
        if (typeof raw !== "string") return "";
        const s = raw.trim();
        if (!s.startsWith("{")) return "";
        try {
            const obj = JSON.parse(s);
            if (obj?.customType === "emoji" && Array.isArray(obj?.cps)) {
                return obj.cps
                    .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
                    .join("");
            }
        } catch {
        }
        return "";
    };

    const cpsToEmoji = (cps) => {
        if (!Array.isArray(cps)) return "";
        try {
            return cps.map((hex) => String.fromCodePoint(parseInt(hex, 16))).join("");
        } catch {
            return "";
        }
    };

    const getSidebarPreview = (mes) => {
        const raw = typeof mes === "string" ? mes : mes?.mes;
        const parsed = tryParseCustomPayload(raw);

        if (!parsed) return typeof raw === "string" ? raw : "";
        if (parsed.type === "forward") {
            const pv = parsed?.meta?.forward?.preview || {};
            const pvType = pv?.type;

            if (pvType === "emoji") {
                const emoji =
                    cpsToEmoji(pv?.cps) || decodeEmojiFromCpsJson(pv?.text);
                return emoji ? `Đã chuyển tiếp ${emoji}` : "Đã chuyển tiếp";
            }

            if (pvType === "image") return "Đã chuyển tiếp một ảnh";
            if (pvType === "video") return "Đã chuyển tiếp một video";
            if (pvType === "gif") return "Đã chuyển tiếp một GIF";
            if (pvType === "sticker") return "Đã chuyển tiếp một sticker";
            if (pvType === "file") return "Đã chuyển tiếp một tệp";
            if (pvType === "richText") return "Đã chuyển tiếp một văn bản";

            if (typeof pv?.text === "string" && pv.text.trim()) {
                return `Đã chuyển tiếp: ${pv.text}`;
            }

            return "Đã chuyển tiếp";
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
            const {type, name, to, mes} = d;
            if (!mes) return;

            const key = type === "room" ? to : name === user ? to : name;
            if (!key) return;

            const preview = getSidebarPreview(mes);

            dispatch(
                setListUser({
                    name: key,
                    lastMessage: preview,
                    actionTime: Date.now(),
                    type: type === "room" ? "room" : "people",
                    noReorder: false
                })
            );
        };

        // chatSocketServer.on("SEND_CHAT", onChat);

        return () => {
            chatSocketServer.off("SEND_CHAT", onChat);
        };
    }, [user, dispatch]);
    const seqResolverRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        const onCheckOnline = (payload) => {
            const p = payload || {};
            const body = p.data || p;

            const explicitUser = body?.user || body?.name;
            const statusVal =
                typeof body?.status !== "undefined"
                    ? body.status
                    : typeof body?.data?.status !== "undefined"
                        ? body.data.status
                        : undefined;

            if (explicitUser) {
                dispatch(
                    setUserOnlineStatus({name: explicitUser, online: !!statusVal})
                );
                return;
            }

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

    useEffect(() => {
        if (!user || !Array.isArray(list) || list.length === 0) return;

        let cancelled = false;

        const runSequentialChecks = async () => {
            for (const item of list) {
                if (cancelled) break;
                if (item.type === "room") continue;

                const online = await new Promise((resolve) => {
                    seqResolverRef.current = (val) => resolve(!!val);

                    try {
                        // chatSocketServer.send("CHECK_USER_ONLINE", { user: item.name });
                    } catch {
                        seqResolverRef.current = null;
                        resolve(false);
                        return;
                    }

                    setTimeout(() => {
                        if (seqResolverRef.current) {
                            seqResolverRef.current = null;
                            resolve(false);
                        }
                    }, 2500);
                });

                if (cancelled) break;
                dispatch(setUserOnlineStatus({name: item.name, online}));

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
        const keyword = (searchTerm || "").toLowerCase();

        return list.filter(c => {
            if (!c.name?.toLowerCase().includes(keyword)) return false;

            if (activeTab === "user") return c.type !== "room";
            if (activeTab === "room") return c.type === "room";

            return true;
        });
    }, [list, searchTerm, activeTab]);

    const handleSelect = (item) => {
        dispatch(setActiveChat(item.name));
        dispatch(
            setListUser({
                name: item.name,
                increaseUnread: false,
                noReorder: true
            })
        );
        onSelectContact?.(item);
    };
    return {list, filtered, activeChatId, handleSelect, activeTab, setActiveTab};
}