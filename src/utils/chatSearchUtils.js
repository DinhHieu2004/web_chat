export const norm = (s = "") => String(s).toLowerCase().trim();

export const getMsgTs = (m) => {
  if (typeof m?.actionTime === "number") return m.actionTime;
  if (typeof m?.createdAt === "number") return m.createdAt;
  if (typeof m?.ts === "number") return m.ts;

  if (typeof m?.createdAt === "string") {
    const t = Date.parse(m.createdAt);
    if (!Number.isNaN(t)) return t;
  }

  return 0;
};

export const getDateStartTs = (dateFilter) => {
  const now = Date.now();

  if (dateFilter === "TODAY") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (dateFilter === "7D") return now - 7 * 24 * 60 * 60 * 1000;
  if (dateFilter === "30D") return now - 30 * 24 * 60 * 60 * 1000;

  return 0; 
};

export const buildSenderOptions = (messages = []) => {
  const set = new Set();
  messages.forEach((m) => {
    if (m?.sender === "user") set.add("ME");
    else if (m?.from) set.add(m.from);
  });
  return ["ALL", ...Array.from(set)];
};

export const filterBySender = (m, senderFilter) => {
  if (senderFilter === "ALL") return true;
  if (senderFilter === "ME") return m?.sender === "user";
  return m?.from === senderFilter;
};

export const filterByDate = (m, dateFilter) => {
  if (dateFilter === "ALL") return true;
  const ts = getMsgTs(m);
  if (!ts) return false;
  const start = getDateStartTs(dateFilter);
  return ts >= start;
};


