import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useChatState } from "./useChatState";
import { useChatSearch } from "./useChatSearch";
import { useChatActions } from "./useChatActions";
import { useChatSocket } from "./useChatSocket";
import { usePollActions } from "./handleSendPoll";
import { useCallLogic } from "./useCallLogic";
import { useShareLocation } from "./useSendLocation";
import { selectMessagesByChatKey, selectHasMoreByChatKey } from "../redux/selectors/chatSelector";
import {
    makeChatKeyFromActive,
    getPurePreview,
    getMessagePreview,
} from "../utils/chatDataFormatter";

export default function useChatLogic({
    activeChat,
    setActiveChat,
    currentUser,
}) {
    const dispatch = useDispatch();
    const chatKey = makeChatKeyFromActive(activeChat);
    const messages = useSelector(
        chatKey ? selectMessagesByChatKey(chatKey) : () => []
    );
    const contacts = useSelector((state) => state?.listUser?.list || []);
    const messagesEndRef = useRef(null);
    const skipNextAutoScrollRef = useRef(false);
    const prevLenRef = useRef(0);
    const requestedRef = useRef(false);
    const pageRef = useRef(0);

    const ui = useChatState();
    const callLogic = useCallLogic({ activeChat, currentUser, dispatch });
    const search = useChatSearch(messages, chatKey);
    const poll = usePollActions({ activeChat, chatKey, currentUser });
    const location = useShareLocation({ activeChat, chatKey, currentUser });

    const hasMore = useSelector(
        chatKey ? selectHasMoreByChatKey(chatKey) : () => true
    );

    const actions = useChatActions({
        ...ui,
        activeChat,
        chatKey,
        currentUser,
        dispatch,
    });

    const { loadHistory } = useChatSocket(currentUser, callLogic);
    const handleLoadMore = () => {
        if (!activeChat) return;
        if (!hasMore) return;

        skipNextAutoScrollRef.current = true;
        pageRef.current += 1;

        loadHistory(pageRef.current, activeChat);
    };

    useEffect(() => {
        prevLenRef.current = 0;
        requestedRef.current = false;
        skipNextAutoScrollRef.current = false;
    }, [chatKey]);
    useEffect(() => {
        if (!activeChat) return;
        if (requestedRef.current) return;

        requestedRef.current = true;
        skipNextAutoScrollRef.current = true;

        pageRef.current = 1;
        loadHistory(1, activeChat);
    }, [activeChat, loadHistory]);


    useEffect(() => {
        const prevLen = prevLenRef.current;
        const nextLen = messages?.length || 0;

        prevLenRef.current = nextLen;

        if (nextLen > prevLen) {
            if (skipNextAutoScrollRef.current) {
                skipNextAutoScrollRef.current = false;
                return;
            }
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    return {
        ...ui,
        ...search,
        activeChat,
        messages,
        messagesEndRef,
        chatKey,
        contacts,
        callLogic,
        getPurePreview,
        getMessagePreview,
        handlers: {
            ...actions,
            ...poll,

            handleSendLocation: location.sendLocation,
            handleDeleteForMe: actions.handleDeleteForMe,
            handleRecallMessage: actions.handleRecallLocal,
            handleUndoDeleteForMe: actions.handleUndoDeleteForMe,
            handleChatSelect: (contact) => {
                setActiveChat(contact);
                ui.setShowEmojiPicker(false);
                ui.setShowStickerPicker(false);
                ui.setShowGroupMenu(false);
            },
            markSkipNextAutoScroll: () => {
                skipNextAutoScrollRef.current = true;
            },
            handleLoadMore,
            loadHistory,
            hasMore,
            startReply: (msg) => ui.setReplyMsg(msg),
            clearReply: () => ui.setReplyMsg(null),
            toggleSearchPanel: () => ui.setShowSearchPanel((v) => !v),
            closeSearchPanel: () => ui.setShowSearchPanel(false),
            startForward: (payload) => {
                const msg = payload?.message || payload;
                const preview = payload?.preview || getMessagePreview(msg);
                ui.setForwardMsg(msg);
                ui.setForwardPreview(preview);
                ui.setShowForwardModal(true);
            },
            closeForward: () => ui.setShowForwardModal(false),
            toggleEmojiPicker: () => ui.setShowEmojiPicker((v) => !v),
            toggleStickerPicker: () => ui.setShowStickerPicker((v) => !v),
            toggleGroupMenu: () => ui.setShowGroupMenu((v) => !v),
            handleSend: () => actions.handleSend(ui.input),
        },
    };
}
