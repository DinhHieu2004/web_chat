import { useDispatch } from "react-redux";
import { sendPoll, sendPollVote } from "../services/pollSender";
import { addMessage } from "../redux/slices/chatSlice";
import { formatVNDateTime } from "../utils/chatDataFormatter";

export function usePollActions({
    activeChat,
    chatKey,
    currentUser,
}) {
    const dispatch = useDispatch();

    const handleSendPoll = (question, options) => {
        if (!activeChat) return;

        const mes = sendPoll({ activeChat, question, options });
        if (!mes) return;

        // sendPoll returns the stringified message; parse payload for optimistic UI
        let pollPayload = null;
        try {
            const parsed = JSON.parse(mes);
            pollPayload = parsed?.payload || null;
        } catch (e) {
            pollPayload = null;
        }

        dispatch(
            addMessage({
                chatKey,
                message: {
                    id: `local-${Date.now()}`,
                    type: "poll",
                    sender: "user",
                    time: formatVNDateTime(),
                    from: currentUser,
                    to: activeChat.name,
                    poll: pollPayload || mes,
                    optimistic: true,
                },
            })
        );
    };

    const handleSendPollVote = (pollId, optionId) => {
        if (!activeChat) return;

        sendPollVote({
            activeChat,
            pollId,
            optionId,
            userId: currentUser,
        });
    };

    return {
        handleSendPoll,
        handleSendPollVote,
    };
}
