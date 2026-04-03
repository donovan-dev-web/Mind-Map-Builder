// src/services/project-manager.ts
import { ReactFlowJsonObject } from "reactflow";
import { toast } from "@/hooks/use-toast";
import { translations } from "@/config/translations";
import { loadConfig } from "./config.service";
import { toPng, toJpeg, toSvg } from "html-to-image";
import jsPDF from "jspdf";
import { isTauri } from "./utils";
import { pageSizes } from "@/components/printable-view";
import { invokeTauri, listenTauri } from "./tauri";

const PROJECT_STORAGE_KEY = "mind-map-project";

const getTranslations = async () => {
  const config = await loadConfig();
  return translations[config.language];
};

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const promptForFile = (accept: string): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";

    const cleanup = () => {
      window.removeEventListener("focus", handleWindowFocus);
      input.onchange = null;
      input.remove();
    };

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (input.files?.length) return;
        cleanup();
        resolve(null);
      }, 300);
    };

    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      cleanup();
      resolve(file);
    };

    window.addEventListener("focus", handleWindowFocus, { once: true });
    document.body.appendChild(input);
    input.click();
  });

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/**
 * Saves the current project state.
 */
export async function saveProject(projectState: ReactFlowJsonObject): Promise<void> {
  const t = await getTranslations();
  const dataString = JSON.stringify(projectState, null, 2);

  if (isTauri()) {
    downloadBlob(new Blob([dataString], { type: "application/json" }), "mind-map-project.json");
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
      const file = await promptForFile(".json,application/json");
      if (!file) return null;
      const projectJson = await readFileAsText(file);
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
  options?: any & {
    fileName?: string;
    paperSize?: keyof typeof pageSizes;
    orientation?: "portrait" | "landscape";
    margins?: { top: number; right: number; bottom: number; left: number };
  }
): Promise<void> {
  const t = await getTranslations();
  const { fileName = "export", ...captureOptions } = options || {};

  const filter = (node: HTMLElement) => node.dataset?.exportExclude !== "true";
  const finalCaptureOptions = { cacheBust: true, filter, pixelRatio: 2, ...captureOptions };

  try {
    const exportFns = { png: toPng, jpeg: toJpeg, svg: toSvg };
    if (format === "pdf") {
      const dataUrl = await toPng(element, finalCaptureOptions);
      const paperSize = (options?.paperSize ?? "A4") as keyof typeof pageSizes;
      const orientation = options?.orientation ?? "portrait";
      const margins = options?.margins ?? { top: 10, right: 10, bottom: 10, left: 10 };
      const page = pageSizes[paperSize];
      const pageWidth = orientation === "portrait" ? page.width : page.height;
      const pageHeight = orientation === "portrait" ? page.height : page.width;
      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: [pageWidth, pageHeight],
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load PNG export for PDF rendering."));
        img.src = dataUrl;
      });

      const usableWidth = Math.max(pageWidth - margins.left - margins.right, 1);
      const usableHeight = Math.max(pageHeight - margins.top - margins.bottom, 1);
      const scale = Math.min(usableWidth / img.width, usableHeight / img.height);
      const renderWidth = img.width * scale;
      const renderHeight = img.height * scale;
      const offsetX = margins.left + (usableWidth - renderWidth) / 2;
      const offsetY = margins.top + (usableHeight - renderHeight) / 2;

      pdf.addImage(dataUrl, "PNG", offsetX, offsetY, renderWidth, renderHeight);
      pdf.save(`${fileName}.pdf`);
      toast({ title: t.exportSuccessTitle, description: t.exportSuccessDescription });
      return;
    }

    const result = await (exportFns as any)[format](element, finalCaptureOptions);

    if (isTauri()) {
      if (format === "svg") {
        downloadBlob(new Blob([result as string], { type: "image/svg+xml" }), `${fileName}.svg`);
      } else {
        const response = await fetch(result as string);
        const blob = await response.blob();
        downloadBlob(blob, `${fileName}.${format}`);
      }
    } else {
      if (format === "svg") {
        downloadBlob(new Blob([result as string], { type: "image/svg+xml" }), `${fileName}.svg`);
      } else {
        const response = await fetch(result as string);
        const blob = await response.blob();
        downloadBlob(blob, `${fileName}.${format}`);
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
  try {
    const file = await promptForFile("image/*");
    if (!file) return "";
    return await readFileAsDataUrl(file);
  } catch (err) {
    console.error("import image failed", err);
    throw err;
  }
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
