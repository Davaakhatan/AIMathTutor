"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type PanelId = "learning" | "gamification" | "tools" | "settings" | "progress" | null;

interface PanelContextType {
  activePanel: PanelId;
  setActivePanel: (panel: PanelId) => void;
  isAnyPanelOpen: boolean;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelId>(null);

  return (
    <PanelContext.Provider
      value={{
        activePanel,
        setActivePanel,
        isAnyPanelOpen: activePanel !== null,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error("usePanel must be used within a PanelProvider");
  }
  return context;
}

