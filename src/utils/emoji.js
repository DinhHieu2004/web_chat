export const REACTION_EMOJIS = [
  "1F44D",       
  "2764-FE0F",   
  "1F602",       
  "1F62E",       
  "1F622",       
  "1F621",       
];

export function unifiedToEmoji(unified) {
  if (!unified || typeof unified !== "string") return "";
  try {
    return unified
      .split("-")
      .map(hex => String.fromCodePoint(parseInt(hex, 16)))
      .join("");
  } catch {
    return "";
  }
}
