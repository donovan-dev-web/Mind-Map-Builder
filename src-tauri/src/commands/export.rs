// src-tauri/src/commands/export.rs
use tauri::{AppHandle, Runtime};
use std::fs;
use std::path::PathBuf;
use base64::{engine::general_purpose, Engine as _};

fn normalize_path(p: String) -> PathBuf {
    PathBuf::from(p)
}

fn strip_data_prefix(s: &str) -> &str {
    if let Some(idx) = s.find(",") {
        &s[idx + 1..]
    } else {
        s
    }
}

#[tauri::command]
pub fn export_as_png<R: Runtime>(_app: AppHandle<R>, data_url: String, path: String) -> Result<(), String> {
    let b64 = strip_data_prefix(&data_url);
    let bytes = general_purpose::STANDARD.decode(b64).map_err(|e| e.to_string())?;
    let p = normalize_path(path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    fs::write(p, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_as_jpeg<R: Runtime>(_app: AppHandle<R>, data_url: String, path: String) -> Result<(), String> {
    export_as_png(_app, data_url, path)
}

#[tauri::command]
pub fn export_as_svg<R: Runtime>(_app: AppHandle<R>, svg_text: String, path: String) -> Result<(), String> {
    let p = normalize_path(path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    fs::write(p, svg_text).map_err(|e| e.to_string())
}
