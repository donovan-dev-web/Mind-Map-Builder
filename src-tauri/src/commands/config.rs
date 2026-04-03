// src-tauri/src/commands/config.rs
use tauri::{AppHandle, Runtime};
use std::fs;
use std::path::PathBuf;

fn app_config_path() -> PathBuf {
    let mut dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push("mind-map-builder");
    std::fs::create_dir_all(&dir).ok();
    dir.push("config.json");
    dir
}

#[tauri::command]
pub fn load_config<R: Runtime>(_app: AppHandle<R>) -> Result<Option<String>, String> {
    let path = app_config_path();
    if path.exists() {
        fs::read_to_string(&path).map(Some).map_err(|e| e.to_string())
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn save_config<R: Runtime>(_app: AppHandle<R>, config: String) -> Result<(), String> {
    let path = app_config_path();
    fs::write(path, config).map_err(|e| e.to_string())
}
