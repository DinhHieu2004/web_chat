import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getList,
  setActiveChat,
  setListUser,
  setUserOnlineStatus,
} from "../redux/slices/listUserSlice";
import { chatSocketServer } from "../services/socket";
import { tryParseCustomPayload } from "../utils/chatDataFormatter.js";

export default function useSidebarLogic(searchTerm, onSelectContact) {
  const dispatch = useDispatch();
  const { list, activeChatId } = useSelector((state) => state.listUser);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const bootedRef = useRef(false);

  const cpsJsonToEmoji = (raw) => {
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
    } catch (_) {}
    return "";
  };

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
    } catch {}
    return "";
  };

  const getSidebarPreview = (mes) => {
    const raw = typeof mes === "string" ? mes : mes?.mes;
    const parsed = tryParseCustomPayload(raw);

    if (!parsed) return typeof raw === "string" ? raw : "";

    if (parsed.type === "forward") {
      const pv = parsed?.meta?.forward?.preview || {};
      const pvType = pv?.type;
      if (pvType === "emoji") {
        const cps = Array.isArray(pv?.cps) ? pv.cps : null;
        const emojiFromCps = cps
          ? cps.map((hex) => String.fromCodePoint(parseInt(hex, 16))).join("")
          : "";

        const emoji = emojiFromCps || decodeEmojiFromCpsJson(pv?.text);
        return emoji ? `Đã chuyển tiếp ${emoji}` : "Đã chuyển tiếp";
      }

      if (pvType === "emoji") {
        const emoji = decodeEmojiFromCpsJson(pv?.text);
        return emoji ? `Đã chuyển tiếp ${emoji}` : "Đã chuyển tiếp";
      }

      if (pvType === "image") return "Đã chuyển tiếp một ảnh";
      if (pvType === "video") return "Đã chuyển tiếp một video";
      if (pvType === "gif") return "Đã chuyển tiếp một GIF";
      if (pvType === "sticker") return "Đã chuyển tiếp một sticker";
      if (pvType === "file") return "Đã chuyển tiếp một tệp";

      if (typeof pv?.text === "string" && pv.text.trim()) {
        return `Đã chuyển tiếp: ${pv.text}`;
      }

      return "Đã chuyển tiếp";
    }
    const { type, text, fileName } = parsed;

    if (type === "image") return "Đã gửi một ảnh";
    if (type === "video") return "Đã gửi một video";
    if (type === "gif") return "Đã gửi một GIF";
    if (type === "sticker") return "Đã gửi một sticker";
    if (type === "file") return "Đã gửi một tệp";

    if (type === "emoji") return text;
    if (type === "richText") return text || "";

    return text || "";
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

      dispatch(
        setListUser({
          name: key,
          lastMessage: preview,
          actionTime: Date.now(),
          type: type === "room" ? "room" : "people",
        })
      );
    };

    // chatSocketServer.on("SEND_CHAT", onChat);

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
      const statusVal =
        typeof body?.status !== "undefined"
          ? body.status
          : typeof body?.data?.status !== "undefined"
          ? body.data.status
          : undefined;

      if (explicitUser) {
        dispatch(
          setUserOnlineStatus({ name: explicitUser, online: !!statusVal })
        );
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

          setTimeout(() => {
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
    return list.filter((c) =>
      (c.name || "").toLowerCase().includes((searchTerm || "").toLowerCase())
    );
  }, [list, searchTerm]);

  const handleSelect = (item) => {
    dispatch(setActiveChat(item.name));
    onSelectContact?.(item);
  };

  return { list, filtered, activeChatId, handleSelect };
}
