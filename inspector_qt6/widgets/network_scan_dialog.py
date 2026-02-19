"""
Network Scanner Dialog - Real-time network scanning with progress
"""
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QProgressBar,
    QTextEdit, QGroupBox, QScrollArea, QWidget
)
from PyQt6.QtCore import Qt, pyqtSignal, QThread
from PyQt6.QtGui import QFont
from typing import Dict, Any, Optional, List
import subprocess
import json
import re
import socket
from datetime import datetime


class NetworkScanThread(QThread):
    """Thread for running network scan"""
    
    # Signals
    progress_update = pyqtSignal(int, str)  # progress percentage, message
    device_found = pyqtSignal(dict)  # device info
    scan_completed = pyqtSignal(bool, str)  # success, message
    
    def __init__(self):
        super().__init__()
        self.should_stop = False
        self.discovered_devices = []
    
    def run(self):
        """Run network scan"""
        try:
            # Phase 1: Network detection (10%)
            self.progress_update.emit(5, "Detecting network configuration...")
            network_info = self.get_network_info()
            
            if not network_info.get('network_cidr'):
                self.scan_completed.emit(False, "Could not determine network CIDR")
                return
            
            self.progress_update.emit(10, f"Network: {network_info['network_cidr']}")
            
            # Phase 2: Host discovery (20%)
            self.progress_update.emit(15, "Discovering hosts (ARP + ping sweep)...")
            discovered = self.discover_hosts(network_info['network_cidr'])
            
            if self.should_stop:
                return
            
            self.progress_update.emit(20, f"Discovered {len(discovered)} hosts")
            
            # Phase 3: Bluetooth scan (30%)
            self.progress_update.emit(25, "Scanning for Bluetooth devices...")
            bt_devices = self.bluetooth_scan()
            for bt in bt_devices:
                if self.should_stop:
                    return
                self.device_found.emit(bt)
                self.discovered_devices.append(bt)
            
            self.progress_update.emit(30, f"Bluetooth devices: {len(bt_devices)}")
            
            # Phase 4: Nmap scan per host (90%)
            total_devices = len(discovered)
            if total_devices == 0:
                self.scan_completed.emit(True, "No network devices found")
                return
            
            for idx, device in enumerate(discovered):
                if self.should_stop:
                    return
                
                ip = device['ip']
                progress = 30 + int((idx / max(1, total_devices)) * 60)
                self.progress_update.emit(progress, f"Nmap scanning {ip}...")
                
                # Scan to get device info
                device_info = self.quick_nmap_scan(ip)
                device_info['mac'] = device.get('mac', '')
                device_info['hostname'] = device.get('hostname', '')
                
                # Emit device found
                self.device_found.emit(device_info)
                self.discovered_devices.append(device_info)
            
            # Phase 5: Complete (100%)
            self.progress_update.emit(100, f"Scan complete! Found {len(self.discovered_devices)} devices")
            self.scan_completed.emit(True, f"Successfully scanned {len(self.discovered_devices)} devices")
            
        except Exception as e:
            self.scan_completed.emit(False, f"Error: {str(e)}")
    
    def stop(self):
        """Stop the scan"""
        self.should_stop = True
    
    def get_network_info(self) -> Dict[str, Any]:
        """Get local network information"""
        info = {}
        
        try:
            # Get default gateway and interface
            result = subprocess.run(
                ["route", "-n", "get", "default"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if 'gateway:' in line.lower():
                        info['gateway'] = line.split()[-1]
                    elif 'interface:' in line.lower():
                        info['interface'] = line.split()[-1]
            
            # Get local IP and netmask
            if 'interface' in info:
                result = subprocess.run(
                    ["ifconfig", info['interface']],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if 'inet ' in line and 'inet6' not in line:
                            parts = line.strip().split()
                            if len(parts) >= 4:
                                info['local_ip'] = parts[1]
                                
                                # Convert netmask to CIDR
                                netmask = parts[3]
                                try:
                                    import ipaddress
                                    network = ipaddress.IPv4Network(f"{parts[1]}/{netmask}", strict=False)
                                    info['network_cidr'] = str(network)
                                except:
                                    # Fallback to /24
                                    base_ip = '.'.join(parts[1].split('.')[:3])
                                    info['network_cidr'] = f"{base_ip}.0/24"
        except Exception as e:
            print(f"Error getting network info: {e}")
        
        return info
    
    def arp_scan(self, network_cidr: str) -> List[Dict[str, str]]:
        """Perform ARP scan to find devices"""
        devices = []
        
        try:
            # Use arp command
            result = subprocess.run(
                ["arp", "-a"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    # Parse: hostname (192.168.1.1) at aa:bb:cc:dd:ee:ff on en0
                    match = re.search(r'\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([\da-f:]+)', line, re.IGNORECASE)
                    if match:
                        ip = match.group(1)
                        mac = match.group(2)
                        
                        # Get hostname
                        hostname_match = re.match(r'([^\s]+)\s+\(', line)
                        hostname = hostname_match.group(1) if hostname_match else ip
                        
                        devices.append({
                            'ip': ip,
                            'mac': mac,
                            'hostname': hostname
                        })
        except Exception as e:
            print(f"ARP scan error: {e}")
        
        return devices

    def discover_hosts(self, network_cidr: str) -> List[Dict[str, str]]:
        """Discover hosts using nmap ping sweep, fallback to ARP"""
        if self.command_exists("nmap"):
            try:
                result = subprocess.run(
                    ["nmap", "-sn", network_cidr],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                if result.returncode == 0:
                    return self.parse_nmap_hosts(result.stdout)
            except Exception:
                pass
        
        return self.arp_scan(network_cidr)

    def parse_nmap_hosts(self, output: str) -> List[Dict[str, str]]:
        """Parse nmap ping sweep output"""
        devices = []
        current_host = None
        
        for line in output.split("\n"):
            if line.startswith("Nmap scan report for"):
                # Nmap scan report for hostname (ip) OR ip
                match = re.search(r"Nmap scan report for (.+)", line)
                if match:
                    host_part = match.group(1)
                    ip_match = re.search(r"\((\d+\.\d+\.\d+\.\d+)\)", host_part)
                    if ip_match:
                        ip = ip_match.group(1)
                        hostname = host_part.split(" (")[0]
                    else:
                        ip = host_part.strip()
                        hostname = ip
                    current_host = {"ip": ip, "hostname": hostname, "mac": ""}
            elif line.strip().startswith("MAC Address:") and current_host:
                mac_match = re.search(r"MAC Address: ([\da-f:]+)", line, re.IGNORECASE)
                if mac_match:
                    current_host["mac"] = mac_match.group(1)
                    devices.append(current_host)
                    current_host = None
        
        # Add hosts without MAC
        if current_host:
            devices.append(current_host)
        
        return devices

    def bluetooth_scan(self) -> List[Dict[str, Any]]:
        """Scan for nearby Bluetooth devices"""
        devices = []
        
        if self.command_exists("hcitool"):
            try:
                result = subprocess.run(
                    ["hcitool", "scan"],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
                if result.returncode == 0:
                    for line in result.stdout.split("\n"):
                        if "\t" in line:
                            parts = line.strip().split("\t")
                            if len(parts) >= 2:
                                address = parts[0].strip()
                                name = parts[1].strip()
                                devices.append({
                                    "ip": "",
                                    "hostname": name,
                                    "mac": "",
                                    "bt_address": address,
                                    "device_type": "Bluetooth",
                                    "ports": [],
                                    "services": []
                                })
            except Exception:
                pass
        elif self.command_exists("system_profiler"):
            try:
                result = subprocess.run(
                    ["system_profiler", "SPBluetoothDataType"],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
                if result.returncode == 0:
                    name = ""
                    address = ""
                    for line in result.stdout.split("\n"):
                        line = line.strip()
                        if line.endswith(":") and "Address:" not in line:
                            name = line.replace(":", "")
                        if "Address:" in line:
                            address = line.split("Address:")[-1].strip()
                            if name and address:
                                devices.append({
                                    "ip": "",
                                    "hostname": name,
                                    "mac": "",
                                    "bt_address": address,
                                    "device_type": "Bluetooth",
                                    "ports": [],
                                    "services": []
                                })
                                name = ""
                                address = ""
            except Exception:
                pass
        
        return devices

    def command_exists(self, command: str) -> bool:
        """Check if a command exists in PATH"""
        try:
            subprocess.run(
                ["which", command],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True
            )
            return True
        except subprocess.CalledProcessError:
            return False
    
    def quick_nmap_scan(self, ip: str) -> Dict[str, Any]:
        """Quick nmap scan to get basic device info"""
        device_info = {
            'ip': ip,
            'scan_time': datetime.now().isoformat(),
            'ports': [],
            'services': [],
            'os': 'Unknown',
            'device_type': 'Unknown'
        }
        
        if not self.command_exists("nmap"):
            device_info['scan_error'] = 'nmap not available'
            return device_info
        
        try:
            # Quick scan: top 100 ports, no OS detection
            result = subprocess.run(
                ["nmap", "-T4", "--top-ports", "100", "-sV", "--open", ip],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                output = result.stdout
                
                # Parse open ports
                for line in output.split('\n'):
                    if '/tcp' in line or '/udp' in line:
                        parts = line.split()
                        if len(parts) >= 3 and 'open' in parts[1]:
                            port_proto = parts[0].split('/')
                            device_info['ports'].append({
                                'port': port_proto[0],
                                'protocol': port_proto[1] if len(port_proto) > 1 else 'tcp',
                                'state': 'open',
                                'service': parts[2] if len(parts) > 2 else ''
                            })
                            
                            if len(parts) > 2:
                                device_info['services'].append(parts[2])
                
                # Determine device type based on services
                device_info['device_type'] = self.guess_device_type(device_info['services'])
        
        except subprocess.TimeoutExpired:
            device_info['scan_error'] = 'Timeout'
        except Exception as e:
            device_info['scan_error'] = str(e)
        
        return device_info
    
    def guess_device_type(self, services: List[str]) -> str:
        """Guess device type based on services"""
        services_str = ' '.join(services).lower()
        
        if 'router' in services_str or 'upnp' in services_str:
            return 'Router'
        elif 'http' in services_str or 'https' in services_str:
            if 'ssh' in services_str or 'telnet' in services_str:
                return 'Server'
            return 'Workstation'
        elif 'ssh' in services_str:
            return 'Server'
        elif 'printer' in services_str or 'ipp' in services_str:
            return 'Printer'
        elif 'smb' in services_str or 'microsoft-ds' in services_str:
            return 'Workstation'
        else:
            return 'Unknown'


class NetworkScanDialog(QDialog):
    """Dialog showing network scan progress and results"""
    
    device_discovered = pyqtSignal(dict)  # Emit when device is found
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.scan_thread = None
        self.device_count = 0
        self.init_ui()
    
    def init_ui(self):
        """Initialize the dialog UI"""
        self.setWindowTitle("Network Scan")
        self.setMinimumSize(600, 500)
        self.setModal(True)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # Title
        title = QLabel("🔍 Scanning Network")
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #ecf0f1;")
        layout.addWidget(title)
        
        # Status label
        self.status_label = QLabel("Initializing scan...")
        self.status_label.setStyleSheet("font-size: 14px; color: #95a5a6;")
        layout.addWidget(self.status_label)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setMinimum(0)
        self.progress_bar.setMaximum(100)
        self.progress_bar.setValue(0)
        self.progress_bar.setTextVisible(True)
        self.progress_bar.setMinimumHeight(30)
        layout.addWidget(self.progress_bar)
        
        # Results group
        results_group = QGroupBox("Discovered Devices")
        results_layout = QVBoxLayout(results_group)
        
        self.results_text = QTextEdit()
        self.results_text.setReadOnly(True)
        self.results_text.setMinimumHeight(250)
        self.results_text.setStyleSheet("""
            QTextEdit {
                background-color: #1a1a1a;
                color: #ecf0f1;
                border: 1px solid #34495e;
                border-radius: 5px;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
            }
        """)
        results_layout.addWidget(self.results_text)
        
        layout.addWidget(results_group)
        
        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        self.stop_btn = QPushButton("Stop Scan")
        self.stop_btn.setMinimumHeight(40)
        self.stop_btn.setMinimumWidth(120)
        self.stop_btn.setStyleSheet("""
            QPushButton {
                background-color: #e74c3c;
                color: white;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #c0392b;
            }
        """)
        self.stop_btn.clicked.connect(self.stop_scan)
        button_layout.addWidget(self.stop_btn)
        
        self.close_btn = QPushButton("Close")
        self.close_btn.setMinimumHeight(40)
        self.close_btn.setMinimumWidth(120)
        self.close_btn.setEnabled(False)
        self.close_btn.clicked.connect(self.accept)
        button_layout.addWidget(self.close_btn)
        
        layout.addLayout(button_layout)
    
    def start_scan(self):
        """Start the network scan"""
        self.scan_thread = NetworkScanThread()
        self.scan_thread.progress_update.connect(self.on_progress_update)
        self.scan_thread.device_found.connect(self.on_device_found)
        self.scan_thread.scan_completed.connect(self.on_scan_completed)
        self.scan_thread.start()
        
        self.results_text.append("Starting network scan...\n")
    
    def on_progress_update(self, percentage: int, message: str):
        """Handle progress update"""
        self.progress_bar.setValue(percentage)
        self.status_label.setText(message)
    
    def on_device_found(self, device_info: Dict[str, Any]):
        """Handle device discovery"""
        self.device_count += 1
        
        # Add to results
        ip = device_info.get('ip', 'Unknown')
        mac = device_info.get('mac', 'Unknown')
        hostname = device_info.get('hostname', ip)
        device_type = device_info.get('device_type', 'Unknown')
        bt_address = device_info.get('bt_address', '')
        ports = device_info.get('ports', [])
        
        result_text = f"\n[{self.device_count}] Device Found:\n"
        if ip:
            result_text += f"  IP:       {ip}\n"
        result_text += f"  Hostname: {hostname}\n"
        if mac:
            result_text += f"  MAC:      {mac}\n"
        if bt_address:
            result_text += f"  BT Addr:  {bt_address}\n"
        result_text += f"  Type:     {device_type}\n"
        
        if ports:
            result_text += f"  Ports:    "
            port_list = [f"{p['port']}/{p['protocol']}" for p in ports[:5]]
            result_text += ", ".join(port_list)
            if len(ports) > 5:
                result_text += f" (+{len(ports) - 5} more)"
            result_text += "\n"
        
        self.results_text.append(result_text)
        
        # Emit signal for parent to add to canvas
        self.device_discovered.emit(device_info)
    
    def on_scan_completed(self, success: bool, message: str):
        """Handle scan completion"""
        self.progress_bar.setValue(100)
        self.status_label.setText(message)
        
        if success:
            self.results_text.append(f"\n✅ {message}")
        else:
            self.results_text.append(f"\n❌ {message}")
        
        self.stop_btn.setEnabled(False)
        self.close_btn.setEnabled(True)
    
    def stop_scan(self):
        """Stop the scan"""
        if self.scan_thread and self.scan_thread.isRunning():
            self.scan_thread.stop()
            self.scan_thread.wait()
            self.status_label.setText("Scan stopped by user")
            self.stop_btn.setEnabled(False)
            self.close_btn.setEnabled(True)
