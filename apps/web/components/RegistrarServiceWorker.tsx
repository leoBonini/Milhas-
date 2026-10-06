"use client";

import { useEffect } from "react";

/** Registra o service worker (necessário para instalar o PWA e, na Fase 4, para o Web Push). */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
