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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateResult {
    status: String,
    message: String,
    previous_commit: Option<String>,
    current_commit: Option<String>,
    output: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NetworkScanResult {
    status: String,
    message: String,
    output_file: Option<String>,
    scan_data: Option<serde_json::Value>,
    timestamp: String,
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

fn find_repo_root() -> Result<PathBuf, String> {
    let mut dir = std::env::current_dir().map_err(|err| format!("Failed to read current dir: {err}"))?;
    loop {
        let candidate = dir.join(".git");
        if candidate.exists() {
            return Ok(dir);
        }
        if !dir.pop() {
            break;
        }
    }
    Err("Git repository not found. Run the desktop app from a git clone.".to_string())
}

fn run_cmd(cmd: &str, args: &[&str], cwd: &PathBuf) -> Result<String, String> {
    let output = Command::new(cmd)
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|err| format!("Failed to run {cmd}: {err}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("{cmd} failed: {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
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

#[tauri::command]
fn run_network_scan(app: AppHandle, project_id: String, interface: Option<String>) -> Result<NetworkScanResult, String> {
    let repo_root = find_repo_root()?;
    let script_path = repo_root.join("scripts/network-topology-mapper.py");
    
    if !script_path.exists() {
        return Err("Network scanner script not found. Please ensure scripts/network-topology-mapper.py exists.".to_string());
    }

    // Create output directory
    let output_dir = repo_root.join("network-scans");
    fs::create_dir_all(&output_dir).map_err(|err| format!("Failed to create output directory: {err}"))?;

    // Generate timestamped filename
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let output_file = output_dir.join(format!("network-scan-{}-{}.json", project_id, timestamp));

    // Build command
    let mut args = vec![
        script_path.to_str().unwrap(),
        "-o",
        output_file.to_str().unwrap(),
    ];

    if let Some(iface) = interface.as_ref() {
        args.push("-i");
        args.push(iface);
    }

    // Check if running as root (required for network scanning)
    let whoami_output = Command::new("whoami")
        .output()
        .map_err(|err| format!("Failed to check user: {err}"))?;
    let current_user = String::from_utf8_lossy(&whoami_output.stdout).trim().to_string();

    if current_user != "root" {
        return Ok(NetworkScanResult {
            status: "error".to_string(),
            message: "Network scanning requires root privileges. Please run the app with sudo or use: sudo python3 scripts/network-topology-mapper.py".to_string(),
            output_file: None,
            scan_data: None,
            timestamp,
        });
    }

    // Run the network scanner
    let output = Command::new("python3")
        .args(&args)
        .current_dir(&repo_root)
        .output()
        .map_err(|err| format!("Failed to run network scanner: {err}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Ok(NetworkScanResult {
            status: "error".to_string(),
            message: format!("Network scan failed: {}", stderr),
            output_file: None,
            scan_data: None,
            timestamp,
        });
    }

    // Read and parse the scan results
    let scan_data = if output_file.exists() {
        let data = fs::read_to_string(&output_file)
            .map_err(|err| format!("Failed to read scan results: {err}"))?;
        serde_json::from_str::<serde_json::Value>(&data).ok()
    } else {
        None
    };

    Ok(NetworkScanResult {
        status: "success".to_string(),
        message: format!("Network scan completed. Found {} devices.", 
            scan_data.as_ref()
                .and_then(|d| d.get("devices"))
                .and_then(|d| d.as_object())
                .map(|d| d.len())
                .unwrap_or(0)
        ),
        output_file: Some(output_file.to_string_lossy().to_string()),
        scan_data,
        timestamp,
    })
}

#[tauri::command]
fn run_app_update(branch: String) -> Result<UpdateResult, String> {
    let repo_root = find_repo_root()?;

    run_cmd("git", &["--version"], &repo_root)?;
    let status = run_cmd("git", &["status", "--porcelain"], &repo_root)?;
    if !status.trim().is_empty() {
        return Ok(UpdateResult {
            status: "error".to_string(),
            message: "Working tree has uncommitted changes. Commit or stash before updating.".to_string(),
            previous_commit: None,
            current_commit: None,
            output: Some(status),
        });
    }

    let previous_commit = run_cmd("git", &["rev-parse", "HEAD"], &repo_root).ok();
    let fetch_output = run_cmd("git", &["fetch", "origin", &branch], &repo_root)?;
    let remote_commit = run_cmd("git", &["rev-parse", &format!("origin/{branch}")], &repo_root)?;

    if previous_commit.as_deref() == Some(remote_commit.as_str()) {
        return Ok(UpdateResult {
            status: "up-to-date".to_string(),
            message: "Already up to date.".to_string(),
            previous_commit,
            current_commit: Some(remote_commit),
            output: Some(fetch_output),
        });
    }

    let pull_output = run_cmd("git", &["pull", "--ff-only", "origin", &branch], &repo_root)?;
    let install_output = run_cmd("npm", &["install"], &repo_root)?;
    let build_output = run_cmd("npm", &["run", "build", "-ws", "--if-present"], &repo_root)?;
    let current_commit = run_cmd("git", &["rev-parse", "HEAD"], &repo_root).ok();

    let output = format!(
        "{fetch_output}\n{pull_output}\n{install_output}\n{build_output}"
    );

    Ok(UpdateResult {
        status: "updated".to_string(),
        message: "Update completed. Restart the app to use the latest build.".to_string(),
        previous_commit,
        current_commit,
        output: Some(output),
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_registered_endpoints,
            register_endpoint,
            remove_endpoint,
            list_docker_containers,
            run_app_update,
            run_network_scan,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
