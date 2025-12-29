import { useState, useMemo, useEffect, useRef } from "react";
import { buildSenderOptions, filterBySender, filterByDate } from "../utils/chatSearchUtils";

export function useChatSearch(messages, chatKey) {
    const [messageSearchQuery, setMessageSearchQuery] = useState("");
    const [senderFilter, setSenderFilter] = useState("ALL");
    const [dateFilter, setDateFilter] = useState("ALL");
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);
    const messageRefs = useRef({});

    const norm = (s = "") => String(s).toLowerCase().trim();

    useEffect(() => {
        setMessageSearchQuery("");
        setSenderFilter("ALL");
        setDateFilter("ALL");
        setActiveMatchIndex(0);
    }, [chatKey]);

    const matchedMessages = useMemo(() => {
        const q = norm(messageSearchQuery);
        if (!q) return [];
        return (messages || []).filter((m) => norm(m?.text || "").includes(q));
    }, [messages, messageSearchQuery]);

    const filteredResults = useMemo(() => {
        return (matchedMessages || []).filter(
            (m) => filterBySender(m, senderFilter) && filterByDate(m, dateFilter)
        );
    }, [matchedMessages, senderFilter, dateFilter]);

    const matchIds = useMemo(() => matchedMessages.map((m) => m.id), [matchedMessages]);

    const scrollToMatchIndex = (idx) => {
        if (!matchIds.length) return;
        const safeIdx = Math.max(0, Math.min(idx, matchIds.length - 1));
        setActiveMatchIndex(safeIdx);
        const id = matchIds[safeIdx];
        messageRefs.current?.[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return {
        messageSearchQuery, setMessageSearchQuery,
        senderFilter, setSenderFilter,
        dateFilter, setDateFilter,
        activeMatchIndex, messageRefs,
        matchedMessages, filteredResults, matchIds,
        senderOptions: useMemo(() => buildSenderOptions(messages || []), [messages]),
        gotoNextMatch: () => scrollToMatchIndex((activeMatchIndex + 1) % matchIds.length),
        gotoPrevMatch: () => scrollToMatchIndex((activeMatchIndex - 1 + matchIds.length) % matchIds.length),
        scrollToMatchById: (id) => messageRefs.current?.[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
    };
}