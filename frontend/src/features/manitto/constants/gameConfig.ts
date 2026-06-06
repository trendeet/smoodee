export const PALETTE = {
  coral: "#E9967A",
  beige: "#F5E6D3",
  offWhite: "#FAF9F6",
  darkNavy: "#162B44",
  gold: "#DAA520",
  silver: "#C0C0C0",
  black: "#000000",
} as const;

export const GREETING_PRESETS = [
  "안녕하세요! 👋",
  "좋은 하루~! ✨",
  "선물 놓고 가요 🎁",
  "응원합니다! 💪",
  "몰래 다녀감 🤫",
] as const;

export const MISSIONS = [
  { id: "visit",  title: "마니띠 방 방문하기",      desc: "상대방 방에 들어가보세요" },
  { id: "drop",   title: "선물·메시지·힌트 남기기", desc: "마니띠 방 바닥에 무언가를 놓아요" },
  { id: "greet",  title: "인사 보내기",              desc: "말풍선으로 인사를 전해봐요" },
] as const;

export type MissionId = typeof MISSIONS[number]["id"];
