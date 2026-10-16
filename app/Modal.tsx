"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
};

// Lukkes med Esc, ×-knappen eller klik udenfor
export default function Modal({ title, onClose, wide, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-10"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-lg border border-gray-200 bg-surface p-6 shadow-xl`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Luk" className="icon-btn -mt-2 -mr-2 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
