// src/services/node-template.service.ts
import { isTauri } from "./utils";
import { invokeTauri } from "./tauri";
import type { CustomNodeLayout } from "@/lib/node-templates";

const TEMPLATES_STORAGE_KEY = "custom-node-templates";

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
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

/**
 * List all custom node templates.
 * Returns an array of CustomNodeLayout objects.
 */
export async function getNodeTemplates(): Promise<CustomNodeLayout[]> {
  if (isTauri()) {
    try {
      const res = await invokeTauri<string[]>("get_node_templates");
      if (!res) return [];
      return res.map((s) => JSON.parse(s) as CustomNodeLayout);
    } catch (e) {
      console.error("Tauri get_node_templates failed:", e);
      return [];
    }
  }

  // Web fallback - store an array of CustomNodeLayout objects in localStorage
  const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
  if (!saved) return [];
  try {
    const arr = JSON.parse(saved);
    if (Array.isArray(arr)) return arr as CustomNodeLayout[];
  } catch (e) {
    console.error("Failed to parse templates from localStorage", e);
  }
  return [];
}

/**
 * Save a custom node template.
 */
export async function saveNodeTemplate(template: CustomNodeLayout): Promise<void> {
  if (isTauri()) {
    try {
      await invokeTauri("save_node_template", { template: JSON.stringify(template) });
      return;
    } catch (e) {
      console.error("Tauri save_node_template failed:", e);
      throw e;
    }
  }

  // Web fallback: read existing array, replace or add by name
  try {
    const templates = await getNodeTemplates();
    const idx = templates.findIndex((t) => t.name === template.name);
    if (idx >= 0) templates[idx] = template;
    else templates.push(template);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error("Failed to save template in web fallback:", e);
    throw e;
  }
}

/**
 * Delete a custom node template by its name.
 */
export async function deleteNodeTemplate(name: string): Promise<void> {
  if (isTauri()) {
    try {
      await invokeTauri("delete_node_template", { template_name: name });
      return;
    } catch (e) {
      console.error("Tauri delete_node_template failed:", e);
      throw e;
    }
  }

  try {
    const templates = await getNodeTemplates();
    const filtered = templates.filter((t) => t.name !== name);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete template in web fallback:", e);
    throw e;
  }
}

/**
 * Opens a file dialog to import an SVG file.
 * This is a Tauri-specific feature.
 */
export async function importSvgFile(): Promise<string> {
  try {
    const file = await promptForFile(".svg,image/svg+xml");
    if (!file) return "";
    return await readFileAsText(file);
  } catch (e) {
    console.error("SVG import failed:", e);
    return "";
  }
}
