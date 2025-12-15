export const makeOutgoingPayload = ({ type, to, mes, url = null, messageType = "text" }) => {
    let wsType;
    if (type === "room") {
        wsType = "room";
    } else if (type === "people") {
        wsType = "people";
    } else {
        console.warn("Unknown chat type:", type);
        return null;
    }

    return {
        type: wsType,
        to: to,
        mes: mes,
        url: url,
        messageType: messageType, 
    };
};
export const makeChatKeyFromActive = (chat) => {
    if (!chat) return null;
    if (chat.type === "room") return `group:${chat.name}`;
    if (chat.type === "people") return `user:${chat.name}`;
    return null;
};