// src-tauri/src/commands/project.rs
use tauri::{AppHandle, Runtime};
use std::fs;
use std::path::PathBuf;

fn normalize_path(p: String) -> PathBuf {
    PathBuf::from(p)
}

#[tauri::command]
pub fn save_project<R: Runtime>(_app: AppHandle<R>, path: String, project_state: String) -> Result<(), String> {
    let p = normalize_path(path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    fs::write(&p, project_state).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_project<R: Runtime>(_app: AppHandle<R>, path: String) -> Result<String, String> {
    let p = normalize_path(path);
    fs::read_to_string(p).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_project_file<R: Runtime>(_app: AppHandle<R>, path: String) -> Result<String, String> {
    open_project(_app, path)
}
