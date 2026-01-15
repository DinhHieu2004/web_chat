import { useDispatch } from "react-redux";
import { sendPoll, sendPollVote } from "../services/pollSender";
import { addMessage, updatePollVote } from "../redux/slices/chatSlice";
import { formatVNDateTime } from "../utils/chatDataFormatter";
import { setListUser } from "../redux/slices/listUserSlice";

export function usePollActions({ activeChat, chatKey, currentUser }) {
    const dispatch = useDispatch();

    const handleSendPoll = (question, options) => {
        if (!activeChat) return;

        const mes = sendPoll({ activeChat, question, options });
        if (!mes) return;

        let pollPayload = null;
        try {
            pollPayload = JSON.parse(mes);
        } catch (e) {
            console.error("Parse poll error:", e);
            return;
        }

        const now = Date.now();

        dispatch(
            addMessage({
                chatKey,
                message: {
                    id: `local-${now}`,
                    chatKey,
                    type: "poll",
                    sender: "user",
                    actionTime: now,
                    time: formatVNDateTime(now),
                    from: currentUser,
                    to: activeChat.name,
                    poll: pollPayload,
                    rawMes: mes,
                    mes: mes,
                    optimistic: true,
                },
            })
        );

        dispatch(
            setListUser({
                name: activeChat.name,
                lastMessage: `📊 ${pollPayload.question}`,
                actionTime: now,
                type: activeChat.type,
            })
        );
    };

    const handleSendPollVote = (pollId, optionId) => {
        if (!activeChat || !currentUser || !pollId || !optionId) return;

        dispatch(
            updatePollVote({
                chatKey,
                pollId,
                optionId,
                userId: currentUser,
                action: "add",
            })
        );

        sendPollVote({
            activeChat,
            pollId,
            optionId,
            userId: currentUser,
        });
    };

    const handleRemovePollVote = (pollId, optionId) => {
        if (!activeChat || !currentUser || !pollId || !optionId) return;

        dispatch(
            updatePollVote({
                chatKey,
                pollId,
                optionId,
                userId: currentUser,
                action: "remove",
            })
        );

    };

    return {
        handleSendPoll,
        handleSendPollVote,
        handleRemovePollVote,
    };
}