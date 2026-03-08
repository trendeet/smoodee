export interface RecentItem {
  id: string;
  title: string;
  date: string;
  status: string;
  thumb: string;
}

export const MOCK_RECENT: RecentItem[] = [
  {
    id: "r1",
    title: "제주도 여행",
    date: "2023.10.24",
    status: "draft",
    thumb: "bg-emerald-100",
  },
  {
    id: "r2",
    title: "강릉 겨울바다",
    date: "2023.11.10",
    status: "complete",
    thumb: "bg-blue-100",
  },
];
