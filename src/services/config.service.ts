// src/services/config.service.ts
import { Config, defaultConfig } from "@/config/config";
import { isTauri } from "./utils";
import { invokeTauri } from "./tauri";

/**
 * Loads the configuration. Uses Tauri when available, otherwise localStorage.
 */
export async function loadConfig(): Promise<Config> {
  console.log("isTauri check:", isTauri());

  if (isTauri()) {
    try {
      const configStr = await invokeTauri<string | null>("load_config");
      if (configStr) {
        try {
          const parsed = JSON.parse(configStr);
          return { ...defaultConfig, ...parsed };
        } catch (e) {
          console.error("Failed to parse config from Tauri", e);
          return defaultConfig;
        }
      }
      return defaultConfig;
    } catch (e) {
      console.error("Tauri invoke load_config failed:", e);
      return defaultConfig;
    }
  }

  // Web fallback
  const savedConfig = localStorage.getItem("mind-map-builder-config");
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig);
      return { ...defaultConfig, ...parsed };
    } catch (e) {
      console.error("Failed to parse config from localStorage", e);
    }
  }
  return defaultConfig;
}

/**
 * Saves the configuration.
 */
export async function saveConfig(config: Config): Promise<void> {
  console.log("isTauri check:", isTauri());
  const configString = JSON.stringify(config, null, 2);

  if (isTauri()) {
    await invokeTauri("save_config", { config: configString });
    return;
  }

  // Web fallback
  localStorage.setItem("mind-map-builder-config", configString);
}
