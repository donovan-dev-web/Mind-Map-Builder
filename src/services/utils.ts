/**
 * Détecte si l'application tourne dans un environnement Tauri.
 * Compatible Tauri 2.x (utilise __TAURI_METADATA__ injecté par Tauri).
 */
// src/services/utils.ts
import { invoke } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  // invoke est injecté uniquement si on est dans Tauri
  return typeof window !== "undefined" && typeof invoke === "function";
}
