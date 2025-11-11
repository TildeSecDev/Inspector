#!/usr/bin/env bash
set -euo pipefail

# provision_os_container.sh
# Creates a Windows (dockur/windows) or macOS (sickcodes/Docker-OSX) container.
# NOTE:
#  - These images rely on hardware virtualization (KVM). They must run on a Linux host with /dev/kvm accessible.
#  - Running macOS requires Apple hardware and compliance with Apple's EULA.
#  - On macOS Docker Desktop hosts this script will NOT succeed (no nested KVM). Use a Linux/KVM host.
#  - Produced containers are NOT yet integrated with blockbash exec flow; further work needed (e.g., WinRM/SSH bridging).

usage() {
  cat <<'EOF'
Usage: provision_os_container.sh --os <windows|macos> [--user <name>] [--name <container_name>] [--cpus N] [--memory 4G] [--disk 64G] [--force]

Examples:
  ./scripts/provision_os_container.sh --os windows --user alice --cpus 4 --memory 6G
  ./scripts/provision_os_container.sh --os macos   --name blockbash-macos --memory 8G --cpus 6

Outputs a JSON summary on success:
  {"container":"blockbash-win-alice","os":"windows","id":"<shortId>","ports":{"rdp":3389,"ssh":2222}}

Prerequisites:
  * Linux host with KVM: test with: [ -e /dev/kvm ] && echo OK || echo FAIL
  * Docker Engine with sufficient privileges
  * For macOS: run only on Apple hardware (legal requirement) + nested virtualization enabled

Windows Image (dockur/windows):
  Image: docker.io/dockurr/windows
  Default exposed ports: 8006 (web console), 3389 (RDP), 22 (SSH if enabled), others optional

macOS Image (sickcodes/docker-osx):
  Image: docker.io/sickcodes/docker-osx:auto (headless by default; VNC / SPICE can be enabled)

Flags:
  --os           Target OS: windows or macos (required)
  --user         Logical user label (used in generated name if --name omitted)
  --name         Explicit container name override
  --cpus         vCPUs (default 4)
  --memory       RAM size (default 4G)
  --disk         Disk size for macOS (default 64G)
  --force        Remove any existing container with the same name
  -h|--help      Show this help

Limitations / TODO:
  - Not wired into backend manager.js yet.
  - No automatic SSH / WinRM provisioning logic; manual post-config may be needed.
  - Add WinRM or OpenSSH bootstrap for Windows & SSH exposure for macOS for integration.
EOF
}

if [[ $# -eq 0 ]]; then usage; exit 1; fi

OS=""; USER_LABEL="user"; NAME=""; CPUS=4; MEM=4G; DISK=64G; FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --os) OS="$2"; shift 2;;
    --user) USER_LABEL="$2"; shift 2;;
    --name) NAME="$2"; shift 2;;
    --cpus) CPUS="$2"; shift 2;;
    --memory) MEM="$2"; shift 2;;
    --disk) DISK="$2"; shift 2;;
    --force) FORCE=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

if [[ -z "$OS" ]]; then echo "--os required"; usage; exit 1; fi
case "$OS" in
  windows|macos) ;;
  *) echo "Unsupported --os '$OS' (must be windows or macos)"; exit 1;;
esac

if [[ ! -e /dev/kvm ]]; then
  echo "[WARN] /dev/kvm not present. This likely won't work unless you're on a Linux KVM host." >&2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found" >&2; exit 1
fi

BASE_NAME="${NAME}";
if [[ -z "$BASE_NAME" ]]; then
  if [[ "$OS" == "windows" ]]; then BASE_NAME="blockbash-win-${USER_LABEL}"; else BASE_NAME="blockbash-macos-${USER_LABEL}"; fi
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${BASE_NAME}$"; then
  if [[ $FORCE -eq 1 ]]; then
    echo "[INFO] Removing existing container $BASE_NAME"
    docker rm -f "$BASE_NAME" >/dev/null || true
  else
    echo "[ERROR] Container $BASE_NAME already exists. Use --force to replace." >&2
    exit 2
  fi
fi

if [[ "$OS" == "windows" ]]; then
  IMAGE="dockurr/windows"
  echo "[INFO] Pulling $IMAGE (this can be large / slow)" >&2
  docker pull "$IMAGE" >/dev/null
  # Ports: 8006 web, 3389 RDP, 22 SSH (if enabled inside guest)
  # NOTE: Additional env vars (e.g., VERSION, LANG, KEYBOARD) can be added as needed.
  CID=$(docker run -d \
      --name "$BASE_NAME" \
      --hostname win-${USER_LABEL} \
      --device /dev/kvm \
      --cap-add NET_ADMIN \
      -e VERSION=win11 \
      -e RAM="$MEM" \
      -e CPU="$CPUS" \
      -p 8006 \
      -p 3389 \
      "$IMAGE")
  SHORT=${CID:0:12}
  echo "{\"container\":\"$BASE_NAME\",\"os\":\"windows\",\"id\":\"$SHORT\",\"ports\":{\"web\":8006,\"rdp\":3389}}"
  exit 0
fi

if [[ "$OS" == "macos" ]]; then
  IMAGE="sickcodes/docker-osx:auto"
  echo "[INFO] Pulling $IMAGE (this can be very large / slow)" >&2
  docker pull "$IMAGE" >/dev/null
  # Expose default SSH port mapping (guest 10022) for future integration
  CID=$(docker run -d \
      --name "$BASE_NAME" \
      --device /dev/kvm \
      -e RAM="$MEM" \
      -e CPU="$CPUS" \
      -e WIDTH=1440 -e HEIGHT=900 \
      -e GENERATE_UNIQUE=true \
      -e MASTER_PLIST_URL=https://raw.githubusercontent.com/sickcodes/osx-serial-generator/master/config-custom.plist \
      -p 10022 \
      "$IMAGE")
  SHORT=${CID:0:12}
  echo "{\"container\":\"$BASE_NAME\",\"os\":\"macos\",\"id\":\"$SHORT\",\"ports\":{\"ssh\":10022}}"
  exit 0
fi

echo "Unexpected fallthrough" >&2; exit 3
