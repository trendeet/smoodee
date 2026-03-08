export interface ChatMessage {
  id: number;
  user: string;
  text: string;
  time: string;
  isMe: boolean;
  isSystem?: boolean;
}

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    user: "김대리",
    text: "오늘 하루도 화이팅입니다! 💪",
    time: "09:00",
    isMe: false,
  },
  { id: 2, user: "나", text: "화이팅하세요~~", time: "09:05", isMe: true },
];

export const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    );
  }
}
