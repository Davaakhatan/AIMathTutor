"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "achievement";
  duration: number;
  title?: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"], duration?: number, title?: string) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: Toast["type"] = "info",
      duration = 4000,
      title?: string
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type, duration, title }]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useGlobalToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useGlobalToast must be used within a ToastProvider");
  }
  return context;
}

// Export for backward compatibility
export { ToastContext };
