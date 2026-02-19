"""Twin Designer Page - Visual topology editor"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QSplitter, QPushButton,
    QLabel, QDockWidget
)
from PyQt6.QtCore import Qt, pyqtSignal
from inspector_qt6.widgets.topology_canvas import TopologyCanvas
from inspector_qt6.widgets.properties_panel import PropertiesPanel
from inspector_qt6.widgets.canvas_preview import CanvasPreview
from inspector_qt6.models.topology import Topology
from inspector_qt6.core.topology_utils import topology_to_yaml, validate_topology
from datetime import datetime
from pathlib import Path
import re
import subprocess
import json
from typing import Optional


class TwinDesignerPage(QWidget):
    """Page for designing network topologies"""
    
    # Signals
    topology_changed = pyqtSignal()
    
    def __init__(self):
        super().__init__()
        self.current_topology: Optional[Topology] = None
        self.init_ui()
    
    def init_ui(self):
        """Initialize the designer UI"""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Center: Canvas with overlay preview
        canvas_container = QWidget()
        canvas_layout = QVBoxLayout(canvas_container)
        canvas_layout.setContentsMargins(0, 0, 0, 0)
        
        self.topology_canvas = TopologyCanvas()
        self.topology_canvas.topology_changed.connect(self._on_canvas_changed)
        self.topology_canvas.node_selected.connect(self._on_node_selected)
        self.topology_canvas.set_link_type_options(self._default_link_options())
        canvas_layout.addWidget(self.topology_canvas)
        
        # Canvas Preview as overlay (bottom-right)
        self.canvas_preview = CanvasPreview(parent=self.topology_canvas)
        self.canvas_preview.set_canvas(self.topology_canvas)
        self.canvas_preview.setGeometry(
            self.topology_canvas.width() - 260,  # 250 width + 10 margin
            self.topology_canvas.height() - 210,  # 200 height + 10 margin
            250, 200
        )
        self.canvas_preview.raise_()
        
        # Update preview position on resize
        self.topology_canvas.resizeEvent = self._on_canvas_resize
        
        layout.addWidget(canvas_container, stretch=1)
        
        # Right panel with SCAN button and properties
        right_panel = QWidget()
        right_panel.setMaximumWidth(300)
        right_panel.setStyleSheet("background-color: #2c2c2c; padding: 10px;")
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(10, 10, 10, 10)
        right_layout.setSpacing(15)
        
        # SCAN Network button at top
        scan_btn = QPushButton("🔍 SCAN Network")
        scan_btn.setMinimumHeight(45)
        scan_btn.setStyleSheet("""
            QPushButton {
                background-color: #27ae60;
                color: white;
                font-weight: bold;
                font-size: 14px;
                border-radius: 5px;
                padding: 10px;
            }
            QPushButton:hover {
                background-color: #2ecc71;
            }
            QPushButton:pressed {
                background-color: #229954;
            }
        """)
        scan_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        scan_btn.clicked.connect(self._on_scan_network)
        right_layout.addWidget(scan_btn)
        
        # Properties Panel
        self.properties_panel = PropertiesPanel()
        self.properties_panel.properties_updated.connect(self._on_properties_updated)
        right_layout.addWidget(self.properties_panel, stretch=1)
        
        # Link mode toggle
        self.link_mode_btn = QPushButton("Link Mode: Off")
        self.link_mode_btn.setCheckable(True)
        self.link_mode_btn.setMinimumHeight(36)
        self.link_mode_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.link_mode_btn.clicked.connect(self._toggle_link_mode)
        right_layout.addWidget(self.link_mode_btn)
        
        # Build/Stop controls
        controls_layout = QHBoxLayout()
        controls_layout.setSpacing(10)
        
        self.build_btn = QPushButton("Build")
        self.build_btn.setMinimumHeight(40)
        self.build_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.build_btn.clicked.connect(self._on_build_topology)
        controls_layout.addWidget(self.build_btn)
        
        self.stop_btn = QPushButton("Stop")
        self.stop_btn.setMinimumHeight(40)
        self.stop_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.stop_btn.setStyleSheet("""
            QPushButton {
                background-color: #c0392b;
                color: white;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #e74c3c;
            }
        """)
        self.stop_btn.clicked.connect(self._on_stop_topology)
        controls_layout.addWidget(self.stop_btn)
        
        self.reset_btn = QPushButton("Reset")
        self.reset_btn.setMinimumHeight(40)
        self.reset_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.reset_btn.setToolTip("Reset destroys the lab, clears all device state, and redeploys.")
        self.reset_btn.setStyleSheet("""
            QPushButton {
                background-color: #8e44ad;
                color: white;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #9b59b6;
            }
        """)
        self.reset_btn.clicked.connect(self._on_reset_topology)
        controls_layout.addWidget(self.reset_btn)

        reset_badge = QLabel("⚠")
        reset_badge.setToolTip("Reset clears device state")
        reset_badge.setStyleSheet("color: #f39c12; font-weight: bold; padding-left: 2px;")
        controls_layout.addWidget(reset_badge)

        self.status_btn = QPushButton("Status")
        self.status_btn.setMinimumHeight(40)
        self.status_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.status_btn.clicked.connect(self._on_status_topology)
        controls_layout.addWidget(self.status_btn)
        
        right_layout.addLayout(controls_layout)
        
        # Status label
        self.status_label = QLabel("Status: Idle")
        self.status_label.setStyleSheet("color: #95a5a6; font-size: 12px;")
        right_layout.addWidget(self.status_label)
        
        layout.addWidget(right_panel)
    
    def _on_canvas_resize(self, event):
        """Update preview position when canvas resizes"""
        if hasattr(self, 'canvas_preview'):
            self.canvas_preview.setGeometry(
                self.topology_canvas.width() - 260,
                self.topology_canvas.height() - 210,
                250, 200
            )
        # Call original resize event if it exists
        if hasattr(super(TopologyCanvas, self.topology_canvas), 'resizeEvent'):
            super(TopologyCanvas, self.topology_canvas).resizeEvent(event)
    
    def load_topology(self, topology: Topology):
        """Load a topology into the designer"""
        self.current_topology = topology
        self.topology_canvas.load_topology(topology)
    
    def get_topology(self) -> Topology:
        """Get the current topology from the canvas"""
        return self.topology_canvas.get_topology()
    
    def _on_canvas_changed(self):
        """Handle canvas changes"""
        self.topology_changed.emit()
    
    def _on_node_selected(self, node_id: str):
        """Handle node selection"""
        # Get current topology from canvas
        topology = self.topology_canvas.get_topology()
        node = next((n for n in topology.nodes if n.id == node_id), None)
        if node:
            self.properties_panel.load_node(node)
    
    def _on_properties_updated(self, node_id: str, properties: dict):
        """Handle property updates"""
        self.topology_canvas.update_node_properties(node_id, properties)

    def _toggle_link_mode(self):
        """Toggle link creation mode"""
        enabled = self.link_mode_btn.isChecked()
        self.topology_canvas.set_link_mode(enabled)
        self.link_mode_btn.setText("Link Mode: On" if enabled else "Link Mode: Off")
    
    def _on_scan_network(self):
        """Handle network scan request"""
        from PyQt6.QtWidgets import QMessageBox
        from inspector_qt6.widgets.network_scan_dialog import NetworkScanDialog
        from inspector_qt6.models.topology import Node, Position, UIProperties, NodeProperties
        import uuid
        
        # Show confirmation dialog
        reply = QMessageBox.question(
            self,
            "Scan Network",
            "This will perform an ARP and nmap scan of your local network.\n\n"
            "This may take several minutes.\n\n"
            "Continue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            # Create and show scan dialog
            scan_dialog = NetworkScanDialog(self)
            
            # Connect device_discovered signal to add devices to canvas
            scan_dialog.device_discovered.connect(self._add_scanned_device)
            
            # Start scan
            scan_dialog.start_scan()
            
            # Show dialog
            scan_dialog.exec()
    
    def _add_scanned_device(self, device_info: dict):
        """Add a scanned device to the canvas"""
        from inspector_qt6.models.topology import Node, Position, UIProperties, NodeProperties
        import uuid
        
        # Get device details
        ip = device_info.get('ip', '')
        hostname = device_info.get('hostname', ip or 'Unknown')
        device_type = device_info.get('device_type', 'Unknown')
        mac = device_info.get('mac', '')
        bt_address = device_info.get('bt_address', '')
        
        # Map device type to kind
        kind_map = {
            'Router': 'router',
            'Server': 'server',
            'Workstation': 'workstation',
            'Printer': 'server',
            'Bluetooth': 'workstation',
            'Unknown': 'server'
        }
        kind = kind_map.get(device_type, 'server')
        
        # Map device type to color
        color_map = {
            'Router': '#e74c3c',      # Red
            'Server': '#3498db',      # Blue
            'Workstation': '#9b59b6', # Purple
            'Printer': '#f39c12',     # Orange
            'Bluetooth': '#1abc9c',   # Teal
            'Unknown': '#95a5a6'      # Gray
        }
        color = color_map.get(device_type, '#95a5a6')
        
        # Calculate position (arrange in grid)
        existing_count = len(self.topology_canvas.topology.nodes)
        col = existing_count % 5
        row = existing_count // 5
        x = 100 + (col * 150)
        y = 100 + (row * 120)
        
        # Create node
        node_id = str(uuid.uuid4())
        node_name = hostname if hostname and hostname != ip else f"{device_type}-{ip.split('.')[-1] if ip else 'bt'}"
        node = Node(
            id=node_id,
            name=node_name,
            kind=kind,
            image=self._get_image_for_kind(kind),
            properties=NodeProperties(
                env={
                    'IP_ADDRESS': ip,
                    'MAC_ADDRESS': mac,
                    'DEVICE_TYPE': device_type,
                    'BT_ADDRESS': bt_address
                }
            ),
            ui=UIProperties(
                position=Position(x=float(x), y=float(y)),
                color=color
            )
        )
        
        # Add to canvas
        self.topology_canvas.add_node(node)
    
    def _get_image_for_kind(self, kind: str) -> str:
        """Get default Docker image for device kind"""
        images = {
            "server": "alpine:latest",
            "router": "frrouting/frr:latest",
            "switch": "networkop/cx:latest",
            "firewall": "alpine:latest",
            "workstation": "alpine:latest"
        }
        return images.get(kind, "alpine:latest")

    def _default_link_options(self) -> list[dict]:
        """Default link type options shown in the popup menu"""
        return [
            {"label": "Ethernet (full-duplex)", "link_type": "veth", "link_params": {"media": "ethernet", "duplex": "full"}, "interface_prefix": "eth"},
            {"label": "Ethernet (half-duplex)", "link_type": "veth", "link_params": {"media": "ethernet", "duplex": "half"}, "interface_prefix": "eth"},
            {"label": "WiFi (emulated)", "link_type": "veth", "link_params": {"media": "wifi", "delay": "15ms", "loss": "1%"}, "interface_prefix": "wlan"},
            {"label": "5G (emulated)", "link_type": "veth", "link_params": {"media": "5g", "delay": "10ms", "loss": "0.5%"}, "interface_prefix": "cell"},
            {"label": "4G (emulated)", "link_type": "veth", "link_params": {"media": "4g", "delay": "30ms", "loss": "1%"}, "interface_prefix": "cell"},
            {"label": "3G (emulated)", "link_type": "veth", "link_params": {"media": "3g", "delay": "80ms", "loss": "2%"}, "interface_prefix": "cell"},
            {"label": "2G (emulated)", "link_type": "veth", "link_params": {"media": "2g", "delay": "150ms", "loss": "5%"}, "interface_prefix": "cell"},
            {"label": "Bluetooth (emulated)", "link_type": "veth", "link_params": {"media": "bluetooth", "delay": "25ms", "loss": "3%"}, "interface_prefix": "bt"},
            {"label": "BLE (emulated)", "link_type": "veth", "link_params": {"media": "ble", "delay": "15ms", "loss": "2%"}, "interface_prefix": "bt"},
            {"label": "USB", "link_type": "veth", "link_params": {"media": "usb"}, "interface_prefix": "usb"},
            {"label": "USB-C", "link_type": "veth", "link_params": {"media": "usb-c"}, "interface_prefix": "usb"},
            {"label": "mgmt-net", "link_type": "mgmt-net", "link_params": {}, "interface_prefix": "mgmt"},
            {"label": "macvlan (bridge)", "link_type": "macvlan", "link_params": {"mode": "bridge"}, "interface_prefix": "mac"},
            {"label": "macvlan (private)", "link_type": "macvlan", "link_params": {"mode": "private"}, "interface_prefix": "mac"},
            {"label": "host", "link_type": "host", "link_params": {}, "interface_prefix": "host"},
            {"label": "vxlan", "link_type": "vxlan", "link_params": {"vni": "100", "dst-port": "4789"}, "interface_prefix": "vxlan"},
            {"label": "vxlan-stitch", "link_type": "vxlan-stitch", "link_params": {"vni": "100", "dst-port": "4789"}, "interface_prefix": "vxlan"},
            {"label": "dummy", "link_type": "dummy", "link_params": {}, "interface_prefix": "dummy"},
            {"label": "bridge", "link_type": "bridge", "link_params": {}, "interface_prefix": "br"},
            {"label": "ovs-bridge", "link_type": "ovs-bridge", "link_params": {}, "interface_prefix": "br"},
        ]

    def _lab_paths(self) -> tuple[Path, Path]:
        """Get lab directory and topology file path"""
        topology = self.topology_canvas.get_topology()
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "-", topology.name or "topology")
        lab_root = Path("/Users/nathanbrown-bennett/Inspector/inspector_qt6/containerlab_examples/twin/lab")
        output_dir = lab_root / safe_name
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{safe_name}.clab.yml"
        return output_dir, output_path

    def _ensure_persistent_binds(self, topology: Topology, lab_dir: Path) -> None:
        """Ensure nodes have persistent bind mounts for state preservation"""
        state_root = lab_dir / "state"
        state_root.mkdir(parents=True, exist_ok=True)
        for node in topology.nodes:
            node_state = state_root / node.id
            node_state.mkdir(parents=True, exist_ok=True)
            bind_entry = f"./state/{node.id}:/var/lib/inspector"
            if bind_entry not in node.properties.binds:
                node.properties.binds.append(bind_entry)

    def _on_build_topology(self):
        """Build topology by exporting to containerlab YAML"""
        from PyQt6.QtWidgets import QMessageBox
        
        topology = self.topology_canvas.get_topology()
        valid, errors = validate_topology(topology)
        if not valid:
            QMessageBox.warning(
                self,
                "Invalid Topology",
                "Please fix the following issues before building:\n\n" + "\n".join(errors)
            )
            return
        
        output_dir, output_path = self._lab_paths()
        self._ensure_persistent_binds(topology, output_dir)
        yaml_text = topology_to_yaml(topology)
        output_path.write_text(yaml_text)
        
        # Deploy with containerlab
        if self._is_lab_running(output_path):
            self.status_label.setText("Status: Running (preserved)")
            QMessageBox.information(
                self,
                "Topology Running",
                "Topology is already running. Build skipped to preserve changes."
            )
            return
        
        result = self._run_clab(["deploy", "-t", str(output_path)], cwd=output_dir)
        if result[0]:
            self.status_label.setText(f"Status: Running ({output_path.name})")
            QMessageBox.information(
                self,
                "Topology Deployed",
                f"Topology deployed with containerlab.\n\nFile:\n{output_path}"
            )
        else:
            self.status_label.setText("Status: Build failed")
            QMessageBox.warning(
                self,
                "Deploy Failed",
                result[1]
            )

    def _on_stop_topology(self):
        """Stop running topology (placeholder)"""
        from PyQt6.QtWidgets import QMessageBox
        
        output_dir, output_path = self._lab_paths()
        if not output_path.exists():
            QMessageBox.information(self, "No Topology", "No deployed topology found.")
            return
        
        stop_btn = QMessageBox(self)
        stop_btn.setWindowTitle("Stop Topology")
        stop_btn.setText("Stop topology?\n\nStop will destroy containers.\nStop & Clear will also remove lab artifacts.")
        stop_button = stop_btn.addButton("Stop", QMessageBox.ButtonRole.AcceptRole)
        clear_button = stop_btn.addButton("Stop & Clear", QMessageBox.ButtonRole.DestructiveRole)
        stop_btn.addButton("Cancel", QMessageBox.ButtonRole.RejectRole)
        stop_btn.exec()
        
        clicked = stop_btn.clickedButton()
        if clicked == stop_button:
            result = self._run_clab(["destroy", "-t", str(output_path)], cwd=output_dir)
            if result[0]:
                self.status_label.setText("Status: Stopped")
            else:
                QMessageBox.warning(self, "Stop Failed", result[1])
        elif clicked == clear_button:
            result = self._run_clab(["destroy", "-t", str(output_path), "--cleanup"], cwd=output_dir)
            if result[0]:
                self.status_label.setText("Status: Cleared")
                try:
                    output_path.unlink(missing_ok=True)
                    state_dir = output_dir / "state"
                    if state_dir.exists():
                        for child in state_dir.iterdir():
                            if child.is_dir():
                                for sub in child.iterdir():
                                    if sub.is_file():
                                        sub.unlink(missing_ok=True)
                                child.rmdir()
                        state_dir.rmdir()
                    output_dir.rmdir()
                except Exception:
                    pass
            else:
                QMessageBox.warning(self, "Stop Failed", result[1])

    def _on_reset_topology(self):
        """Reset topology (destroy + clear state + redeploy)"""
        from PyQt6.QtWidgets import QMessageBox
        
        output_dir, output_path = self._lab_paths()
        if not output_path.exists():
            QMessageBox.information(self, "No Topology", "No deployed topology found.")
            return
        
        reply = QMessageBox.question(
            self,
            "Reset Topology",
            "This will destroy the lab and clear all device state.\n\nContinue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        if reply != QMessageBox.StandardButton.Yes:
            return
        
        result = self._run_clab(["destroy", "-t", str(output_path), "--cleanup"], cwd=output_dir)
        if not result[0]:
            QMessageBox.warning(self, "Reset Failed", result[1])
            return
        
        try:
            state_dir = output_dir / "state"
            if state_dir.exists():
                for child in state_dir.iterdir():
                    if child.is_dir():
                        for sub in child.iterdir():
                            if sub.is_file():
                                sub.unlink(missing_ok=True)
                        child.rmdir()
                state_dir.rmdir()
        except Exception:
            pass
        
        # Redeploy
        deploy_result = self._run_clab(["deploy", "-t", str(output_path)], cwd=output_dir)
        if deploy_result[0]:
            self.status_label.setText(f"Status: Running ({output_path.name})")
        else:
            QMessageBox.warning(self, "Deploy Failed", deploy_result[1])

    def _on_status_topology(self):
        """Show containerlab status"""
        from PyQt6.QtWidgets import QMessageBox
        from inspector_qt6.widgets.containerlab_status_dialog import ContainerlabStatusDialog
        
        output_dir, output_path = self._lab_paths()
        if not output_path.exists():
            QMessageBox.information(self, "No Topology", "No deployed topology found.")
            return
        
        status_data = self._get_lab_status(output_path, output_dir)
        dialog = ContainerlabStatusDialog(status_data, self)
        dialog.exec()

    def _run_clab(self, args: list[str], cwd: Optional[Path] = None) -> tuple[bool, str]:
        """Run a containerlab CLI command"""
        try:
            result = subprocess.run(
                ["clab"] + args,
                capture_output=True,
                text=True,
                timeout=300,
                cwd=str(cwd) if cwd else None
            )
            if result.returncode == 0:
                return True, result.stdout.strip()
            return False, (result.stderr or result.stdout or "Unknown error").strip()
        except FileNotFoundError:
            return False, "containerlab CLI not found. Install it and ensure 'clab' is in PATH."
        except Exception as e:
            return False, str(e)

    def _is_lab_running(self, lab_path: Path) -> bool:
        """Check if a containerlab topology is running"""
        status = self._get_lab_status(lab_path, lab_path.parent)
        nodes = status.get("nodes", [])
        return any(node.get("state") == "running" for node in nodes)

    def _get_lab_status(self, lab_path: Path, lab_dir: Path) -> dict:
        """Get status info from containerlab"""
        status_data = {"nodes": [], "links": [], "ips": [], "errors": []}
        
        ok, output = self._run_clab(["inspect", "-t", str(lab_path), "--format", "json"], cwd=lab_dir)
        if ok:
            try:
                data = json.loads(output)
                containers = data.get("containers", data.get("Containers", data.get("nodes", [])))
                for c in containers:
                    status_data["nodes"].append({
                        "name": c.get("name") or c.get("Name"),
                        "state": c.get("state") or c.get("State"),
                        "image": c.get("image") or c.get("Image")
                    })
                    ip = c.get("ipv4") or c.get("IPv4")
                    if ip:
                        status_data["ips"].append(f"{c.get('name')}: {ip}")
                return status_data
            except Exception:
                pass
        
        # Fallback to text output
        ok, output = self._run_clab(["inspect", "-t", str(lab_path)], cwd=lab_dir)
        if not ok:
            status_data["errors"].append(output)
            return status_data
        
        for line in output.split("\n"):
            if "|" in line and "NAME" not in line.upper():
                parts = [p.strip() for p in line.split("|") if p.strip()]
                if len(parts) >= 3:
                    status_data["nodes"].append({
                        "name": parts[0],
                        "state": parts[2],
                        "image": parts[1] if len(parts) > 1 else ""
                    })
        
        return status_data
