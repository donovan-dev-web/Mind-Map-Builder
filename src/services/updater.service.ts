import { isTauri } from "./utils"; 
import { invokeTauri, listenTauri } from "./tauri";

export interface UpdateManifest {
  version: string;
  date: string;
  body: string;
}

export interface CheckResult {
  shouldUpdate: boolean;
  manifest?: UpdateManifest;
}

/**
 * Vérifie si une mise à jour est disponible.
 */
export async function checkUpdate(): Promise<CheckResult> {
  if (!isTauri()) return { shouldUpdate: false };

  try {
    const result = await invokeTauri<CheckResult>("check_update");
    return result ?? { shouldUpdate: false };
  } catch (e) {
    console.error("checkUpdate failed:", e);
    return { shouldUpdate: false };
  }
}

/**
 * Télécharge la mise à jour et reporte la progression.
 */
export async function downloadUpdate(onProgress: (percent: number) => void): Promise<void> {
  if (!isTauri()) {
    // fallback web simulation
    let progress = 0;
    return new Promise((resolve) => {
      const id = setInterval(() => {
        progress += 20;
        onProgress(Math.min(100, progress));
        if (progress >= 100) {
          clearInterval(id);
          resolve();
        }
      }, 400);
    });
  }

  try {
    // Ecoute des événements updater
    const unlisten = await listenTauri<any>("tauri://updater-event", (event) => {
      if (event?.status === "DOWNLOAD_PROGRESS") {
        const payload = event.payload || {};
        const percent = payload.chunkLength && payload.contentLength
          ? Math.floor((payload.chunkLength / payload.contentLength) * 100)
          : 50;
        onProgress(percent);
      } else if (event?.status === "DOWNLOADED") {
        onProgress(100);
        unlisten();
      } else if (event?.error) {
        console.error("Updater event error:", event.error);
      }
    });

    await invokeTauri("install_update");
  } catch (e) {
    console.error("downloadUpdate failed:", e);
    throw e;
  }
}

/**
 * Installe la mise à jour (ou relance l'application).
 */
export async function installUpdate(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invokeTauri("install_update");
  } catch (e) {
    console.warn("installUpdate via updater failed:", e);
    try {
      await invokeTauri("relaunch_app");
    } catch (err) {
      console.error("App relaunch failed:", err);
    }
  }
}
