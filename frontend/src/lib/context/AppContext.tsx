"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";
import { Group, INITIAL_GROUPS } from "@/lib/mock-data/groups";
import { InProgressSession, INITIAL_IN_PROGRESS } from "@/lib/mock-data/sessions";

interface AppContextType {
  groups: Group[];
  inProgressSessions: InProgressSession[];
  setGroups: (groups: Group[]) => void;
  setInProgressSessions: (sessions: InProgressSession[]) => void;
  addGroup: (group: Group) => void;
  saveSession: (session: InProgressSession) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [inProgressSessions, setInProgressSessions] = useState<InProgressSession[]>(
    INITIAL_IN_PROGRESS
  );

  const addGroup = (group: Group) => {
    setGroups((prev) => [group, ...prev]);
  };

  const saveSession = (sessionData: InProgressSession) => {
    setInProgressSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === sessionData.id);
      if (existingIdx >= 0) {
        const newArr = [...prev];
        newArr[existingIdx] = sessionData;
        return newArr;
      }
      return [sessionData, ...prev];
    });
  };

  return (
    <AppContext.Provider
      value={{
        groups,
        inProgressSessions,
        setGroups,
        setInProgressSessions,
        addGroup,
        saveSession,
      }}
    >
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
