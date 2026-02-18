#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, process::Command, time::{SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Endpoint {
    id: String,
    name: String,
    base_url: String,
    health_path: String,
    method: Option<String>,
    timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct EndpointInput {
    name: String,
    base_url: String,
    health_path: String,
    method: Option<String>,
    timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DockerContainer {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "Names")]
    name: String,
    #[serde(rename = "Image")]
    image: String,
    #[serde(rename = "Status")]
    status: String,
    #[serde(rename = "State")]
    state: String,
    #[serde(rename = "Ports")]
    ports: String,
}

fn endpoints_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Failed to resolve app data dir: {err}"))?;
    fs::create_dir_all(&dir).map_err(|err| format!("Failed to create app data dir: {err}"))?;
    Ok(dir.join("registered_endpoints.json"))
}

fn load_endpoints(app: &AppHandle) -> Result<Vec<Endpoint>, String> {
    let path = endpoints_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(&path).map_err(|err| format!("Failed to read endpoints file: {err}"))?;
    serde_json::from_str(&data).map_err(|err| format!("Failed to parse endpoints file: {err}"))
}

fn save_endpoints(app: &AppHandle, endpoints: &[Endpoint]) -> Result<(), String> {
    let path = endpoints_path(app)?;
    let data = serde_json::to_string_pretty(endpoints)
        .map_err(|err| format!("Failed to serialize endpoints: {err}"))?;
    fs::write(&path, data).map_err(|err| format!("Failed to write endpoints file: {err}"))
}

#[tauri::command]
fn get_registered_endpoints(app: AppHandle) -> Result<Vec<Endpoint>, String> {
    load_endpoints(&app)
}

#[tauri::command]
fn register_endpoint(app: AppHandle, payload: EndpointInput) -> Result<Vec<Endpoint>, String> {
    let mut endpoints = load_endpoints(&app)?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| format!("Clock error: {err}"))?
        .as_millis();
    let endpoint = Endpoint {
        id: format!("ep-{now}"),
        name: payload.name,
        base_url: payload.base_url,
        health_path: payload.health_path,
        method: payload.method,
        timeout_ms: payload.timeout_ms,
    };
    endpoints.push(endpoint);
    save_endpoints(&app, &endpoints)?;
    Ok(endpoints)
}

#[tauri::command]
fn remove_endpoint(app: AppHandle, id: String) -> Result<Vec<Endpoint>, String> {
    let mut endpoints = load_endpoints(&app)?;
    endpoints.retain(|endpoint| endpoint.id != id);
    save_endpoints(&app, &endpoints)?;
    Ok(endpoints)
}

#[tauri::command]
fn list_docker_containers() -> Result<Vec<DockerContainer>, String> {
    let output = Command::new("docker")
        .args(["ps", "--format", "{{json .}}"])
        .output()
        .map_err(|err| format!("Failed to run docker: {err}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Docker returned an error: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut containers = Vec::new();
    for line in stdout.lines() {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(container) = serde_json::from_str::<DockerContainer>(line) {
            containers.push(container);
        }
    }

    Ok(containers)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_registered_endpoints,
            register_endpoint,
            remove_endpoint,
            list_docker_containers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
