export interface Template {
  id: string;
  title: string;
  author: string;
  time: string;
  req: string;
  type: string;
  tags: string[];
  thumbGradient: string;
}

export const MOCK_TEMPLATES: Template[] = [
  {
    id: "t1",
    title: "컬러워크",
    author: "컬러워크",
    time: "Custom",
    req: "9장",
    type: "Special",
    tags: ["개인"],
    thumbGradient: "from-red-500 via-red-600 to-red-700",
  },
  {
    id: "t_day",
    title: "하루 공유",
    author: "TeamLog",
    time: "Day",
    req: "영상 6개",
    type: "Group",
    tags: ["그룹"],
    thumbGradient: "from-blue-400 to-cyan-300",
  },
];
