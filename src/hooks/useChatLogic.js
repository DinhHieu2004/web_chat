import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useChatState } from "./useChatState";
import { useChatSearch } from "./useChatSearch";
import { useChatActions } from "./useChatActions";
import { useChatSocket } from "./useChatSocket";
import { usePollActions } from "./handleSendPoll";
import { useCallLogic } from './useCallLogic';
import { selectMessagesByChatKey } from "../redux/selectors/chatSelector";
import { makeChatKeyFromActive, getPurePreview, getMessagePreview } from "../utils/chatDataFormatter";

export default function useChatLogic({ activeChat, setActiveChat, currentUser }) {
    const dispatch = useDispatch();
    const chatKey = makeChatKeyFromActive(activeChat);
    const messages = useSelector(chatKey ? selectMessagesByChatKey(chatKey) : () => []);
    const contacts = useSelector((state) => state?.listUser?.list || []);
    const messagesEndRef = useRef(null);

    const ui = useChatState();
    const callLogic = useCallLogic({ activeChat, currentUser, dispatch });
    const search = useChatSearch(messages, chatKey);
    const poll = usePollActions({ activeChat, chatKey, currentUser });

    const actions = useChatActions({
        ...ui, activeChat, chatKey, currentUser, dispatch
    });

    const { loadHistory } = useChatSocket(currentUser, callLogic);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return {
        ...ui, ...search, activeChat, messages, messagesEndRef, contacts, callLogic,
        getPurePreview, getMessagePreview,
        handlers: {
            ...actions,
            ...poll,
            handleChatSelect: (contact) => {
                setActiveChat(contact);
                loadHistory(1, contact);
                ui.setShowEmojiPicker(false);
                ui.setShowStickerPicker(false);
                ui.setShowGroupMenu(false);
            },
            loadHistory,
            startReply: (msg) => ui.setReplyMsg(msg),
            clearReply: () => ui.setReplyMsg(null),
            toggleSearchPanel: () => ui.setShowSearchPanel(v => !v),
            closeSearchPanel: () => ui.setShowSearchPanel(false),
            startForward: (payload) => {

                const msg = payload?.message || payload;
                const preview = payload?.preview || getMessagePreview(msg);
                ui.setForwardMsg(msg);
                ui.setForwardPreview(preview);
                ui.setShowForwardModal(true);
            },
            closeForward: () => ui.setShowForwardModal(false),
            toggleEmojiPicker: () => ui.setShowEmojiPicker(v => !v),
            toggleStickerPicker: () => ui.setShowStickerPicker(v => !v),
            toggleGroupMenu: () => ui.setShowGroupMenu(v => !v),
            handleSend: () => actions.handleSend(ui.input),
        }
    };
}