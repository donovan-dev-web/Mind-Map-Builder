// src-tauri/src/commands/files.rs
use tauri::{AppHandle, Runtime};
use std::fs;
use std::path::PathBuf;
use base64::{engine::general_purpose, Engine as _};
use mime_guess;

fn normalize_path(p: String) -> PathBuf {
    PathBuf::from(p)
}

#[tauri::command]
pub fn import_svg_file<R: Runtime>(_app: AppHandle<R>, file_path: String) -> Result<String, String> {
    let p = normalize_path(file_path);
    fs::read_to_string(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_image_file<R: Runtime>(_app: AppHandle<R>, file_path: String) -> Result<String, String> {
    let p = normalize_path(file_path.clone());
    let bytes = fs::read(&p).map_err(|e| e.to_string())?;
    let mime = mime_guess::from_path(&p).first_or_octet_stream();
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime.essence_str(), b64))
}
