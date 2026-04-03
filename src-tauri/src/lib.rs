// src-tauri/src/lib.rs
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
    )
    .invoke_handler(tauri::generate_handler![
      commands::config::load_config,
      commands::config::save_config,
      commands::node_templates::get_node_templates,
      commands::node_templates::save_node_template,
      commands::node_templates::delete_node_template,
      commands::files::import_svg_file,
      commands::files::import_image_file,
      commands::project::save_project,
      commands::project::open_project,
      commands::project::read_project_file,
      commands::export::export_as_png,
      commands::export::export_as_jpeg,
      commands::export::export_as_svg
    ])
    .setup(|_app| Ok(()))
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
