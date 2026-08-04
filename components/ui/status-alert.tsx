"use client";

import { useEffect, useState } from "react";

type StatusAlertProps = {
  tone: string;
  text: string;
};

export function StatusAlert({ tone, text }: StatusAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    const timer = window.setTimeout(() => setIsVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, [text, tone]);

  if (!isVisible) return null;

  return <div className={`mb-4 rounded-md border px-4 py-3 text-sm font-medium ${tone}`}>{text}</div>;
}
