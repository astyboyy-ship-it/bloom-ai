/// Bloom AI Desktop: a native window over the Bloom AI web app. It opens on /launch (the cinematic
/// entrance), which hands off to the /desk workspace. The engines run server-side, so the app needs no
/// local runtime and stays current with every web deploy.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Bloom AI Desktop");
}
