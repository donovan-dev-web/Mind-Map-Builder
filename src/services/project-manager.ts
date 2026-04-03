// src/services/project-manager.ts
import { ReactFlowJsonObject } from "reactflow";
import { toast } from "@/hooks/use-toast";
import { translations } from "@/config/translations";
import { loadConfig } from "./config.service";
import { toPng, toJpeg, toSvg } from "html-to-image";
import { isTauri } from "./utils";
import { pageSizes } from "@/components/printable-view";
import { invokeTauri, listenTauri } from "./tauri";

const PROJECT_STORAGE_KEY = "mind-map-project";

const getTranslations = async () => {
  const config = await loadConfig();
  return translations[config.language];
};

/**
 * Saves the current project state.
 */
export async function saveProject(projectState: ReactFlowJsonObject): Promise<void> {
  const t = await getTranslations();
  const dataString = JSON.stringify(projectState, null, 2);

  if (isTauri()) {
    // Try both camelCase and snake_case keys (robustness)
    try {
      await invokeTauri("save_project", { projectState: dataString });
    } catch (e1) {
      try {
        await invokeTauri("save_project", { project_state: dataString });
      } catch (e2) {
        console.error("save_project invoke failed:", e1, e2);
        throw e2;
      }
    }
    toast({ title: t.saveProjectSuccess });
    return;
  }

  // Web fallback: localStorage
  localStorage.setItem(PROJECT_STORAGE_KEY, dataString);
  toast({
    title: t.saveProjectSuccess,
    description: t.saveProjectSuccessDescription,
  });
}

/**
 * Opens a project (Tauri -> dialog + read, Web -> localStorage or file input)
 */
export async function openProject(): Promise<ReactFlowJsonObject | null> {
  const t = await getTranslations();

  if (isTauri()) {
    try {
      const projectJson = await invokeTauri<string | null>("open_project");
      if (!projectJson) return null;
      try {
        const projectData = JSON.parse(projectJson);
        toast({ title: t.loadProjectSuccess });
        return projectData;
      } catch (err) {
        toast({ variant: "destructive", title: t.loadProjectError, description: "Le fichier de projet est invalide ou corrompu." });
        return null;
      }
    } catch (err) {
      console.error("open_project failed:", err);
      toast({ variant: "destructive", title: t.loadProjectError, description: t.loadProjectErrorDescription });
      return null;
    }
  }

  // Web fallback: localStorage
  const dataString = localStorage.getItem(PROJECT_STORAGE_KEY);
  if (!dataString) {
    toast({
      variant: "destructive",
      title: t.loadProjectError,
      description: t.loadProjectErrorDescription,
    });
    return null;
  }
  try {
    const projectData = JSON.parse(dataString);
    toast({
      title: t.loadProjectSuccess,
      description: t.loadProjectSuccessDescription,
    });
    return projectData;
  } catch (error) {
    console.error("Failed to parse project from local storage", error);
    toast({
      variant: "destructive",
      title: t.loadProjectError,
      description: t.loadProjectErrorDescription,
    });
    return null;
  }
}

/**
 * Export the element as png/jpeg/svg/pdf.
 * - For png/jpeg: html-to-image returns a dataURL (we send base64 to rust)
 * - For svg: html-to-image returns an SVG string -> send svg text
 */
export async function exportAs(
  format: "png" | "jpeg" | "svg" | "pdf",
  element: HTMLElement,
  options?: any & { fileName?: string; paperSize?: keyof typeof pageSizes; orientation?: "portrait" | "landscape" }
): Promise<void> {
  const t = await getTranslations();
  const { fileName = "export", ...captureOptions } = options || {};

  const filter = (node: HTMLElement) => node.dataset?.exportExclude !== "true";
  const finalCaptureOptions = { cacheBust: true, filter, pixelRatio: 2, ...captureOptions };

  try {
    const exportFns = { png: toPng, jpeg: toJpeg, svg: toSvg };
    const result = await (exportFns as any)[format](element, finalCaptureOptions);

    if (isTauri()) {
      if (format === "svg") {
        // result is an SVG string
        await invokeTauri("export_as_svg", { svg: result, fileName: `${fileName}.svg` });
      } else {
        // result is a dataURL -> strip prefix and send base64
        const dataUrl: string = result as string;
        const base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
        const cmd = `export_as_${format}`;
        await invokeTauri(cmd, { data: base64Data, fileName: `${fileName}.${format}` });
      }
    } else {
      // Web fallback: trigger download
      if (format === "svg") {
        const blob = new Blob([result as string], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.svg`;
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const dataUrl = result as string;
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${fileName}.${format}`;
        a.click();
        a.remove();
      }
    }

    toast({ title: t.exportSuccessTitle, description: t.exportSuccessDescription });
  } catch (error: any) {
    console.error(`Failed to export as ${format}`, error);
    toast({
      variant: "destructive",
      title: t.exportErrorTitle,
      description: t.exportErrorDescription,
    });
  }
}

/**
 * Import image for node (Tauri only).
 */
export async function importImageForNode(): Promise<string> {
  if (isTauri()) {
    try {
      const dataUri = await invokeTauri<string>("import_image_file");
      return dataUri ?? "";
    } catch (err) {
      console.error("import_image_file failed", err);
      throw err;
    }
  }
  alert("Image import is only available in the desktop application.");
  return "";
}

/**
 * Listen for OS open-file events (tauri://file-drop). Returns unlisten function.
 */
export async function listenForOpenFile(callback: (projectData: ReactFlowJsonObject) => void): Promise<() => void> {
  if (isTauri()) {
    try {
      const unlisten = await listenTauri("tauri://file-drop", async (event: any) => {
        // event payload shapes vary; try to extract path
        let path: string | undefined;
        try {
          const p = event?.payload;
          if (!p) {
            if (Array.isArray(event)) path = event[0];
          } else if (typeof p === "string") path = p;
          else if (Array.isArray(p) && p.length > 0) path = p[0];
          else if (p.paths && Array.isArray(p.paths) && p.paths.length > 0) path = p.paths[0];
        } catch (e) {
          console.warn("Could not parse file-drop event", e, event);
        }

        if (!path) return;
        try {
          const fileContent = await invokeTauri<string>("read_project_file", { path });
          if (!fileContent) return;
          const pd = JSON.parse(fileContent);
          callback(pd);
        } catch (err) {
          console.error("read_project_file failed", err);
          const t = await getTranslations();
          toast({ variant: "destructive", title: t.loadProjectError, description: "Le fichier de projet est invalide ou corrompu." });
        }
      });

      // Normalize returned unlisten (tauriListen returns a function or promise-of-function)
      return () => {
        if (!unlisten) return;
        try {
          // unlisten may be a function or a promise that resolves to a function
          if (typeof unlisten === "function") {
            (unlisten as any)().catch((e: any) => console.error("unlisten failed", e));
          } else if (typeof (unlisten as any).then === "function") {
            (unlisten as any).then((fn: any) => fn && fn().catch && fn().catch((e: any) => console.error("unlisten failed", e)));
          }
        } catch (e) {
          console.warn("unlisten call error", e);
        }
      };
    } catch (e) {
      console.error("tauri listen failed:", e);
      // fallback to web drag / drop
    }
  }

  // Web fallback: drag & drop listener
  const handler = async (ev: DragEvent) => {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const pd = JSON.parse(text);
      callback(pd);
    } catch (err) {
      console.error("Dropped file not valid JSON", err);
    }
  };
  window.addEventListener("drop", handler);
  const dragOver = (ev: DragEvent) => ev.preventDefault();
  window.addEventListener("dragover", dragOver);

  return () => {
    window.removeEventListener("drop", handler);
    window.removeEventListener("dragover", dragOver);
  };
}
