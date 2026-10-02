"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ToastContextValue {
  message: string | null;
  showToast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2200);
  }, []);

  const value = useMemo(() => ({ message, showToast }), [message, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? <div className="toast show" role="status">{message}</div> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
