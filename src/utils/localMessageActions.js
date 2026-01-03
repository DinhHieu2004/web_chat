const STORAGE_KEY = "chat_local_actions_v1";

export const getMsgKey = (m) => {
  const from = m?.from || "";
  const to = m?.to || "";
  const actionTime = m?.actionTime || "";
  const type = m?.type || "text";

  const text =
    typeof m?.text === "string"
      ? m.text
      : (m?.text?.text || "");

  const url = m?.url || "";
  const fileName = m?.fileName || "";
  const rawMes = typeof m?.rawMes === "string" ? m.rawMes : "";

  return `${from}|${to}|${actionTime}|${type}|${text}|${url}|${fileName}|${rawMes}`.slice(0, 800);
};

const readAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
};

const writeAll = (obj) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
};

export const addLocalDeleted = (chatKey, msgKey) => {
  const all = readAll();
  const cur = all[chatKey] || { deleted: [], recalled: [] };

  if (!cur.deleted.includes(msgKey)) cur.deleted.push(msgKey);

  all[chatKey] = cur;
  writeAll(all);
};

export const addLocalRecalled = (chatKey, msgKey) => {
  const all = readAll();
  const cur = all[chatKey] || { deleted: [], recalled: [] };

  if (!cur.recalled.includes(msgKey)) cur.recalled.push(msgKey);

  all[chatKey] = cur;
  writeAll(all);
};

export const getLocalActions = (chatKey) => {
  const all = readAll();
  const cur = all[chatKey] || { deleted: [], recalled: [] };
  return {
    deleted: new Set(cur.deleted || []),
    recalled: new Set(cur.recalled || []),
  };
};
