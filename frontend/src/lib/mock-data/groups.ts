export interface GroupMember {
  name: string;
  role: string;
  avatar: string;
  status: string;
}

export interface GroupSlot {
  id: string;
  label: string;
  time?: string;
  user: string;
  status: string;
  color: string;
  name?: string;
}

export interface Group {
  id: string;
  title: string;
  members: number;
  status: string;
  progress: number;
  theme: string;
  icon: string;
  description: string;
  type: string;
  memberList: GroupMember[];
  slots: GroupSlot[];
}

export interface DayShareSlot {
  id: number;
  label: string;
  time: string;
}

export const INITIAL_GROUPS: Group[] = [
  {
    id: "g1",
    title: "점심 기록방 🍱",
    members: 4,
    status: "active",
    progress: 50,
    theme: "bg-orange-50",
    icon: "🍱",
    description: "매일 맛있는 점심을 기록해요!",
    type: "day_share",
    memberList: [
      {
        name: "나",
        role: "Owner",
        avatar: "bg-gray-900",
        status: "오늘도 맛점!",
      },
      {
        name: "김대리",
        role: "Member",
        avatar: "bg-blue-500",
        status: "다이어트 중...",
      },
      {
        name: "이팀장",
        role: "Member",
        avatar: "bg-green-500",
        status: "회의중",
      },
      {
        name: "박사원",
        role: "Member",
        avatar: "bg-purple-500",
        status: "휴가",
      },
    ],
    slots: [
      {
        id: "s1",
        label: "09:00 출근",
        user: "나",
        status: "filled",
        color: "bg-blue-500",
      },
      {
        id: "s2",
        label: "12:00 점심",
        user: "김대리",
        status: "filled",
        color: "bg-green-500",
      },
      {
        id: "s3",
        label: "15:00 커피",
        user: "",
        status: "empty",
        color: "bg-gray-200",
      },
      {
        id: "s4",
        label: "18:00 퇴근",
        user: "",
        status: "empty",
        color: "bg-gray-200",
      },
    ],
  },
  {
    id: "g2",
    title: "모닝루틴 인증 ☀️",
    members: 3,
    status: "active",
    progress: 100,
    theme: "bg-green-50",
    icon: "☀️",
    description: "오전 일과 완벽하게 클리어!",
    type: "day_share",
    memberList: [
      { name: "나", role: "Owner", avatar: "bg-gray-900", status: "기상 완료" },
      {
        name: "미라클",
        role: "Member",
        avatar: "bg-green-500",
        status: "스트레칭 중",
      },
      {
        name: "갓생",
        role: "Member",
        avatar: "bg-blue-500",
        status: "독서 중",
      },
    ],
    slots: [
      {
        id: "s1",
        label: "06:00 기상",
        user: "미라클",
        status: "filled",
        color: "bg-green-500",
      },
      {
        id: "s2",
        label: "07:00 스트레칭",
        user: "갓생",
        status: "filled",
        color: "bg-blue-500",
      },
      {
        id: "s3",
        label: "08:00 독서",
        user: "나",
        status: "filled",
        color: "bg-purple-500",
      },
      {
        id: "s4",
        label: "09:00 업무시작",
        user: "나",
        status: "filled",
        color: "bg-gray-800",
      },
    ],
  },
];

export const DAY_SHARE_SLOTS: DayShareSlot[] = [
  { id: 1, label: "07:00 기상", time: "07:00" },
  { id: 2, label: "10-11 집중", time: "10:00" },
  { id: 3, label: "12-1 점심", time: "12:00" },
  { id: 4, label: "오후 휴식", time: "15:00" },
  { id: 5, label: "저녁 식사", time: "19:00" },
  { id: 6, label: "하루 마무리", time: "22:00" },
];
