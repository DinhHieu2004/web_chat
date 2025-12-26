
import { chatSocketServer} from "./socket";
import { makeOutgoingPayload } from "../utils/chatDataFormatter";
import { buildPollMessage, buildPollVote } from "../utils/chatDataFormatter";

export const sendPoll = ({activeChat, question, options}) => {
    if(!activeChat) return;

    const m = buildPollMessage(question, options);
    if(!m) return ;

    const mes = JSON.stringify(m);
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

export const sendPollVote = ({ activeChat, pollId, optionId, userId }) => {
    if (!activeChat) return;

    const mes = buildPollVote(pollId, optionId, userId);
    if (!mes) return;

    chatSocketServer.send(
        "SEND_CHAT",
        makeOutgoingPayload({
            type: activeChat.type,
            to: activeChat.name,
            mes: JSON.stringify(mes),
        })
    );
};