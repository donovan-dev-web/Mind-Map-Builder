#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  // on délègue l'exécution à la lib `app_lib::run()` (cf. lib.rs)
  app_lib::run();
}
