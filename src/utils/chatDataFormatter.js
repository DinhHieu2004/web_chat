
export const makeOutgoingPayload = ({ type, to, mes }) => {
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
    to,
    mes,
  };
};

export const makeChatKeyFromActive = (chat) => {
  if (!chat) return null;

  if (chat.type === "room") return `group:${chat.name}`;
  if (chat.type === "people") return `user:${chat.name}`;

  return null;
};


export const formatVNDateTime = (isoLike) => {
  const d = isoLike ? new Date(isoLike) : new Date();

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const DD = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const YYYY = d.getFullYear();

  return `${hh}:${mm} ${DD}-${MM}-${YYYY}`;
};


export const makeChatKeyFromWs = ({ type, from, to, currentUser }) => {
  const isRoom = type === "room" || type === 1;

  if (isRoom) {
    return to ? `group:${to}` : null;
  }

  const otherUser = from === currentUser ? to : from;
  return otherUser ? `user:${otherUser}` : null;
};
