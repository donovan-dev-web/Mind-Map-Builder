// src/types/global.d.ts

export {}; // nécessaire pour que ce fichier soit un module

declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_METADATA__?: unknown; // si tu utilises l'autre version
  }
}
