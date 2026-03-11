"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

interface SelectedGroup {
  id: number;
  projectId?: number;
  name: string;
  inviteCode?: string;
  memberCount?: number;
  currentMemberCount?: number;
  status?: string;
}

interface AppContextType {
  selectedGroup: SelectedGroup | null;
  setSelectedGroup: (group: SelectedGroup | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);

  return (
    <AppContext.Provider value={{ selectedGroup, setSelectedGroup }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
