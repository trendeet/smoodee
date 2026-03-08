export interface SessionSlot {
  type: string;
  id: number;
}

export interface InProgressSession {
  id: string;
  templateId: string;
  title: string;
  step: number;
  selectedColor: {
    name: string;
    bg: string;
    gradient: string;
    text: string;
    swatches: string[];
  };
  gridSize: number;
  slots: (SessionSlot | null)[];
  lastModified: string;
}

export const INITIAL_IN_PROGRESS: InProgressSession[] = [
  {
    id: "ip_1",
    templateId: "t1",
    title: "ColorGrab",
    step: 3,
    selectedColor: {
      name: "Ocean",
      bg: "bg-blue-500",
      gradient: "from-blue-200 via-blue-500 to-indigo-900",
      text: "text-blue-900",
      swatches: [],
    },
    gridSize: 4,
    slots: [{ type: "image", id: 1 }, { type: "image", id: 2 }, null, null],
    lastModified: "10분 전",
  },
];
