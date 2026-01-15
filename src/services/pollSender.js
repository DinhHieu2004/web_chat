import { chatSocketServer } from "./socket";
import { makeOutgoingPayload, buildPollMessage, buildPollVote } from "../utils/chatDataFormatter";

export const sendPoll = ({ activeChat, question, options }) => {
    if (!activeChat) return;

    const pollData = buildPollMessage(question, options);
    if (!pollData) return;

    const mes = JSON.stringify(pollData);

    chatSocketServer.send(
        "SEND_CHAT",
        makeOutgoingPayload({
            type: activeChat.type,
            to: activeChat.name,
            mes,
        })
    );

    return mes;
};

export const sendPollVote = ({ activeChat, pollId, optionId, userId, action = "add" }) => {
    if (!activeChat || !pollId || !optionId || !userId) {
        return;
    }

    const votePayload = {
        customType: "poll_vote",
        pollId: String(pollId),
        optionId: String(optionId),
        userId: String(userId),
        action: action || "add"
    };

    const mesString = JSON.stringify(votePayload);

    const outgoing = makeOutgoingPayload({
        type: activeChat.type,
        to: activeChat.name,
        mes: mesString,
    });

    chatSocketServer.send("SEND_CHAT", outgoing);

    return votePayload;
};