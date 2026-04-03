import { isTauri as utilsIsTauri } from "./utils";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
//import { checkUpdate, installUpdate, onUpdaterEvent } from "@tauri-apps/plugin-updater/api";
//import { relaunch } from "@tauri-apps/plugin-process/api";


/**
 * Vérifie si l'on est dans l'environnement Tauri.
 */
export const isTauri = utilsIsTauri;

/**
 * Wrapper pour invoke Tauri qui garde le typage générique.
 */
export async function invokeTauri<T = unknown>(
  command: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  if (!isTauri()) return null;

  try {
    return await invoke<T>(command, args);
  } catch (e) {
    console.error("Tauri invoke failed:", e);
    return null;
  }
}

/**
 * Wrapper pour listen Tauri qui garde le typage générique.
 */
export async function listenTauri<EventPayload = unknown>(
  eventName: string,
  callback: (event: EventPayload) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};

  try {
    const unlisten = await listen(eventName, (e: { payload: EventPayload }) => callback(e.payload));
    return unlisten;
  } catch (e) {
    console.error("Tauri listen failed:", e);
    return () => {};
  }
}

/**
 * Accès à l'API updater de Tauri (plugin officiel).
 */
export async function updaterTauri() {
  /*if (!isTauri()) return null;

  try {
    return { checkUpdate, installUpdate, onUpdaterEvent };
  } catch (e) {
    console.error("Failed to load Tauri updater module:", e);
    return null;
  }*/
}

/**
 * Accès à l'API process de Tauri (plugin officiel).
 */
export async function processTauri() {
  /*if (!isTauri()) return null;

  try {
    return { relaunch };
  } catch (e) {
    console.error("Failed to load Tauri process module:", e);
    return null;
  }*/
}
