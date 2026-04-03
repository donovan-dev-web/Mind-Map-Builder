// src-tauri/src/commands/node_templates.rs
use tauri::{AppHandle, Runtime};
use std::fs;
use std::path::PathBuf;
use serde_json::Value;

fn templates_dir() -> PathBuf {
    let mut dir = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push("mind-map-builder");
    dir.push("node_templates");
    std::fs::create_dir_all(&dir).ok();
    dir
}

#[tauri::command]
pub fn get_node_templates<R: Runtime>(_app: AppHandle<R>) -> Result<Vec<String>, String> {
    let dir = templates_dir();
    let mut res: Vec<String> = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(s) = fs::read_to_string(&p) {
                    res.push(s);
                }
            }
        }
    }
    Ok(res)
}

#[tauri::command]
pub fn save_node_template<R: Runtime>(_app: AppHandle<R>, template: String) -> Result<(), String> {
    let v: Value = serde_json::from_str(&template).map_err(|e| e.to_string())?;
    let name = v.get("name")
        .and_then(|n| n.as_str())
        .ok_or_else(|| "template must have a \"name\" string field".to_string())?;
    let mut file = templates_dir();
    let safe_name = name.replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_");
    file.push(format!("{}.json", safe_name));
    fs::write(file, template).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_node_template<R: Runtime>(_app: AppHandle<R>, template_name: String) -> Result<(), String> {
    let mut file = templates_dir();
    file.push(format!("{}.json", template_name));
    if file.exists() {
        fs::remove_file(file).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}
