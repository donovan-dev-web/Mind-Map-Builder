// src/services/window.service.ts
import { useNavigate } from "react-router-dom";
import { isTauri } from "./utils";

/**
 * Opens the Node Designer view.
 * - Tauri: opens a WebviewWindow named 'designer' pointing to /designer
 * - Web: opens a new browser tab or uses router navigation
 *
 * router: the 'useNavigate' return value (Next.js App Router), optional for web fallback.
 */
export async function openDesignerWindow(router?: ReturnType<typeof useNavigate>) {
  if (isTauri()) {
    try {
      const mod = await import("@tauri-apps/api/window");
      const WebviewWindow = (mod as any).WebviewWindow ?? (mod as any).default?.WebviewWindow;
      if (!WebviewWindow) {
        console.warn("WebviewWindow not found in @tauri-apps/api/window");
        return;
      }

      const webview = new WebviewWindow("designer", {
        url: "/designer",
        title: "Node Designer",
        width: 1280,
        height: 800,
      });

      webview.once?.("tauri://created", () => console.log("Designer window created"));
      webview.once?.("tauri://error", (e: any) => console.error("Failed to create designer window", e));

      return;
    } catch (e) {
      console.error("Failed to open designer window (tauri import error):", e);
      return;
    }
  }

  // Web fallback
  if (router) {
    try {
      router("/designer");
      return;
    } catch {
      // fallback to window.open
    }
  }

  window.open("/designer", "_blank", "width=1280,height=800");
}

/**
 * Closes the current window.
 * - Tauri: closes the Designer Webview by label if available, otherwise closes the current window
 * - Web: tries window.close(), then history.back() if still open
 */
export async function closeCurrentWindow() {
  if (isTauri()) {
    try {
      const mod = await import("@tauri-apps/api/window");
      const WebviewWindow = (mod as any).WebviewWindow ?? (mod as any).default?.WebviewWindow;
      const getCurrent = mod.getCurrent ?? (mod as any).default?.getCurrent;

      // Dev: try getCurrent() first (works when WebviewWindow.getByLabel may fail)
      const currentWin = getCurrent?.();
      if (currentWin && typeof currentWin.close === "function") {
        await currentWin.close();
        console.log("Current window closed via getCurrent()");
        return;
      }

      // Build: try to close Designer window by label
      if (WebviewWindow) {
        const win = WebviewWindow.getByLabel?.("designer");
        if (win && typeof win.close === "function") {
          await win.close();
          console.log("Designer window closed via label");
          return;
        }
      }

      // Fallback: try appWindow
      const appWindow = (mod as any).appWindow ?? (mod as any).default?.appWindow;
      if (appWindow && typeof appWindow.close === "function") {
        await appWindow.close();
        console.log("appWindow closed");
        return;
      }

      console.warn("No window found to close (Tauri)");
    } catch (e) {
      console.error("Failed to close window via Tauri:", e);
    }
    return;
  }

  // Web fallback
  window.close();
  if (!window.closed) {
    try { window.history.back(); } catch {}
  }
}
