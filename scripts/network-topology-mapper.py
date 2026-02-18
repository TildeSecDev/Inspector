#!/usr/bin/env python3
"""
Network Topology Mapper
=======================
Performs comprehensive network reconnaissance to map local network topology.
Creates detailed device inventory for containerlab/docker simulation.

REQUIRES ROOT/SUDO for ARP and raw socket operations.
For authorized local testing only.
"""

import json
import subprocess
import sys
import re
import ipaddress
import argparse
import socket
from datetime import datetime
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import xml.etree.ElementTree as ET

ARP: Any = None
Ether: Any = None
srp: Any = None
conf: Any = None

try:
    from scapy.all import ARP, Ether, srp, conf  # type: ignore[import-not-found]
    SCAPY_AVAILABLE = True
except ImportError:
    print("⚠️  scapy not available - ARP scanning will use system arp command")
    SCAPY_AVAILABLE = False


class NetworkTopologyMapper:
    """Comprehensive network topology discovery and mapping."""
    
    def __init__(
        self,
        output_file: str = "network-topology.json",
        interface: Optional[str] = None,
        nmap_timeout: int = 900,
        nmap_parallelism: int = 6,
        nmap_min_rate: Optional[int] = 300,
        nmap_max_retries: int = 2,
        nmap_min_parallelism: Optional[int] = None,
        nmap_max_parallelism: Optional[int] = None,
        nmap_initial_rtt: Optional[str] = "250ms",
        nmap_max_rtt: Optional[str] = "1000ms",
    ):
        self.output_file = output_file
        self.interface = interface
        self.nmap_timeout = nmap_timeout
        self.nmap_parallelism = max(1, nmap_parallelism)
        self.nmap_min_rate = nmap_min_rate
        self.nmap_max_retries = nmap_max_retries
        self.nmap_min_parallelism = nmap_min_parallelism
        self.nmap_max_parallelism = nmap_max_parallelism
        self.nmap_initial_rtt = nmap_initial_rtt
        self.nmap_max_rtt = nmap_max_rtt
        self.discovered_devices = {}
        self.topology_edges = []
        self.scan_metadata: Dict[str, Any] = {
            "scan_time": datetime.now().isoformat(),
            "scanner_version": "1.0.0",
            "scan_type": "comprehensive",
        }
        
    def check_prerequisites(self) -> bool:
        """Verify required tools are available."""
        required = ["nmap", "arp"]
        optional = ["hcitool", "traceroute", "fping"]
        
        print("🔍 Checking prerequisites...")
        all_ok = True
        
        for tool in required:
            if not self._command_exists(tool):
                print(f"❌ Required tool not found: {tool}")
                all_ok = False
            else:
                print(f"✓ {tool}")
        
        for tool in optional:
            if self._command_exists(tool):
                print(f"✓ {tool} (optional)")
            else:
                print(f"⚠️  {tool} not found (optional - some features disabled)")
        
        if not SCAPY_AVAILABLE:
            print("⚠️  Python scapy module not installed (optional - reduced functionality)")
        
        return all_ok
    
    def _command_exists(self, command: str) -> bool:
        """Check if a command exists in PATH."""
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
    
    def get_local_network_info(self) -> Dict[str, Any]:
        """Get information about the local network."""
        info = {}
        
        try:
            # Get default route
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
            if 'interface' in info or self.interface:
                iface = self.interface or info.get('interface', 'en0')
                result = subprocess.run(
                    ["ifconfig", iface],
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
                                info['netmask'] = parts[3]
            
            # Calculate network CIDR
            if 'local_ip' in info and 'netmask' in info:
                netmask_value = info['netmask']
                if netmask_value.startswith('0x'):
                    try:
                        netmask_value = str(ipaddress.IPv4Address(int(netmask_value, 16)))
                    except ValueError:
                        pass
                info['netmask'] = netmask_value
                network = ipaddress.IPv4Network(f"{info['local_ip']}/{netmask_value}", strict=False)
                info['network_cidr'] = str(network)
                info['network_size'] = network.num_addresses
        
        except Exception as e:
            print(f"⚠️  Error getting network info: {e}")
        
        return info
    
    def arp_scan(self, network: str) -> List[Dict[str, str]]:
        """Perform ARP scan to discover live hosts."""
        print(f"\n🔎 Performing ARP scan on {network}...")
        devices = []
        
        if SCAPY_AVAILABLE:
            try:
                # Scapy-based ARP scan
                arp_request = ARP(pdst=network)
                broadcast = Ether(dst="ff:ff:ff:ff:ff:ff")
                arp_request_broadcast = broadcast / arp_request
                
                # Set timeout and verbose off
                conf.verb = 0
                answered_list = srp(arp_request_broadcast, timeout=3, retry=2)[0]
                
                for sent, received in answered_list:
                    devices.append({
                        'ip': received.psrc,
                        'mac': received.hwsrc,
                        'discovered_by': 'arp_scapy'
                    })
                    print(f"  Found: {received.psrc} ({received.hwsrc})")
                
            except Exception as e:
                print(f"⚠️  Scapy ARP scan failed: {e}, falling back to system arp")
        
        # Fallback: use system arp-scan or nmap
        if not devices:
            try:
                # Try nmap for ARP scan (requires root)
                result = subprocess.run(
                    ["nmap", "-sn", "-PR", network],
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                if result.returncode == 0:
                    ip_pattern = re.compile(r'Nmap scan report for (?:.*? )?\(?(\d+\.\d+\.\d+\.\d+)\)?')
                    mac_pattern = re.compile(r'MAC Address: ([0-9A-F:]{17})', re.IGNORECASE)
                    
                    current_ip = None
                    for line in result.stdout.split('\n'):
                        ip_match = ip_pattern.search(line)
                        if ip_match:
                            current_ip = ip_match.group(1)
                        
                        mac_match = mac_pattern.search(line)
                        if mac_match and current_ip:
                            devices.append({
                                'ip': current_ip,
                                'mac': mac_match.group(1),
                                'discovered_by': 'arp_nmap'
                            })
                            print(f"  Found: {current_ip} ({mac_match.group(1)})")
                            current_ip = None
            
            except Exception as e:
                print(f"⚠️  Nmap ARP scan failed: {e}")
        
        print(f"✓ ARP scan complete: {len(devices)} devices found")
        return devices
    
    def intensive_nmap_scan(self, target: str) -> Dict[str, Any]:
        """Perform intensive nmap scan on a target."""
        device_info = {
            'ip': target,
            'scan_time': datetime.now().isoformat(),
            'ports': [],
            'services': [],
            'os_detection': {},
            'device_type': 'unknown',
            'distance_hops': None
        }
        
        print(f"  🔬 Scanning {target}...")
        
        try:
            # Comprehensive nmap scan
            # -sS: SYN stealth scan
            # -sV: Version detection
            # -O: OS detection
            # -A: Aggressive scan (OS, version, script, traceroute)
            # -T4: Faster timing
            # --traceroute: Trace hops to target
            # -oX: XML output
            
            xml_file = f"/tmp/nmap_{target.replace('.', '_')}.xml"
            
            cmd = [
                "nmap",
                "-sS",
                "-sV",
                "-O",
                "-A",
                "-vv",
                "-T4",
                "--reason",
                "--host-timeout", f"{self.nmap_timeout}s",
                "--max-retries", str(self.nmap_max_retries),
                "--traceroute",
                "--script=default,discovery,version and not (hostmap-robtex or http-robtex-shared-ns or targets-asn)",
                "-p-",  # Scan all 65535 ports
                "-oX", xml_file,
                target
            ]

            if self.nmap_min_rate is not None:
                cmd.extend(["--min-rate", str(self.nmap_min_rate)])

            if self.nmap_min_parallelism is not None:
                cmd.extend(["--min-parallelism", str(self.nmap_min_parallelism)])

            if self.nmap_max_parallelism is not None:
                cmd.extend(["--max-parallelism", str(self.nmap_max_parallelism)])

            if self.nmap_initial_rtt is not None:
                cmd.extend(["--initial-rtt-timeout", str(self.nmap_initial_rtt)])

            if self.nmap_max_rtt is not None:
                cmd.extend(["--max-rtt-timeout", str(self.nmap_max_rtt)])
            print(f"    ➜ Nmap command: {' '.join(cmd)}")
            print(f"    ⏱️  Host timeout: {self.nmap_timeout}s")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.nmap_timeout + 60  # Allow buffer over host timeout
            )
            
            if result.returncode == 0 and Path(xml_file).exists():
                device_info.update(self._parse_nmap_xml(xml_file))
                Path(xml_file).unlink()  # Clean up
            else:
                print(f"    ⚠️  Nmap scan returned code {result.returncode}")
                if result.stdout:
                    print("    ⚠️  Nmap stdout (truncated):")
                    print("\n".join(result.stdout.splitlines()[-20:]))
                if result.stderr:
                    print("    ⚠️  Nmap stderr (truncated):")
                    print("\n".join(result.stderr.splitlines()[-20:]))
        
        except subprocess.TimeoutExpired:
            print(f"    ⚠️  Scan timeout for {target}")
        except Exception as e:
            print(f"    ⚠️  Error scanning {target}: {e}")
        
        return device_info
    
    def _parse_nmap_xml(self, xml_file: str) -> Dict[str, Any]:
        """Parse nmap XML output."""
        info = {}
        
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
            
            # Get host info
            host = root.find('host')
            if host is None:
                return info
            
            # Hostname
            hostnames = host.find('hostnames')
            if hostnames is not None:
                hostname_elem = hostnames.find('hostname')
                if hostname_elem is not None:
                    info['hostname'] = hostname_elem.get('name', '')
            
            # OS detection
            os_elem = host.find('os')
            if os_elem is not None:
                osmatch = os_elem.find('osmatch')
                if osmatch is not None:
                    os_class = osmatch.find('.//osclass')
                    info['os_detection'] = {
                        'name': osmatch.get('name', ''),
                        'accuracy': osmatch.get('accuracy', ''),
                        'os_family': os_class.get('osfamily', '') if os_class is not None else '',
                        'os_gen': os_class.get('osgen', '') if os_class is not None else '',
                        'vendor': os_class.get('vendor', '') if os_class is not None else ''
                    }
                    
                    # Determine device type
                    if os_class is not None:
                        device_type = os_class.get('type', 'unknown')
                        info['device_type'] = device_type
            
            # Ports and services
            ports_elem = host.find('ports')
            if ports_elem is not None:
                info['ports'] = []
                info['services'] = []
                
                for port_elem in ports_elem.findall('port'):
                    port_id = port_elem.get('portid', '')
                    protocol = port_elem.get('protocol', 'tcp')
                    
                    state_elem = port_elem.find('state')
                    state = state_elem.get('state', 'unknown') if state_elem is not None else 'unknown'
                    
                    service_elem = port_elem.find('service')
                    if service_elem is not None:
                        service_info = {
                            'port': int(port_id),
                            'protocol': protocol,
                            'state': state,
                            'service': service_elem.get('name', ''),
                            'product': service_elem.get('product', ''),
                            'version': service_elem.get('version', ''),
                            'extrainfo': service_elem.get('extrainfo', ''),
                            'cpe': []
                        }
                        
                        for cpe_elem in service_elem.findall('cpe'):
                            service_info['cpe'].append(cpe_elem.text)
                        
                        info['services'].append(service_info)
                    
                    if state == 'open':
                        info['ports'].append({
                            'port': int(port_id),
                            'protocol': protocol,
                            'state': state
                        })
            
            # Traceroute for distance/hops
            trace_elem = host.find('trace')
            if trace_elem is not None:
                hops = trace_elem.findall('hop')
                info['distance_hops'] = len(hops)
                info['traceroute'] = []
                
                for hop in hops:
                    info['traceroute'].append({
                        'ttl': hop.get('ttl', ''),
                        'ip': hop.get('ipaddr', ''),
                        'hostname': hop.get('host', ''),
                        'rtt': hop.get('rtt', '')
                    })
            
            # Uptime
            uptime_elem = host.find('uptime')
            if uptime_elem is not None:
                info['uptime_seconds'] = uptime_elem.get('seconds', '')
            
        except Exception as e:
            print(f"    ⚠️  Error parsing nmap XML: {e}")
        
        return info
    
    def bluetooth_scan(self) -> List[Dict[str, str]]:
        """Scan for nearby Bluetooth devices."""
        print("\n📡 Scanning for Bluetooth devices...")
        devices = []
        
        if not self._command_exists("hcitool"):
            print("  ⚠️  hcitool not available, skipping Bluetooth scan")
            return devices
        
        try:
            # Scan for Bluetooth devices
            result = subprocess.run(
                ["hcitool", "scan", "--flush"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                for line in result.stdout.split('\n')[1:]:  # Skip header
                    line = line.strip()
                    if line:
                        parts = line.split(maxsplit=1)
                        if len(parts) == 2:
                            devices.append({
                                'bluetooth_mac': parts[0],
                                'name': parts[1],
                                'type': 'bluetooth'
                            })
                            print(f"  Found: {parts[0]} - {parts[1]}")
        
        except subprocess.TimeoutExpired:
            print("  ⚠️  Bluetooth scan timeout")
        except Exception as e:
            print(f"  ⚠️  Bluetooth scan error: {e}")
        
        print(f"✓ Bluetooth scan complete: {len(devices)} devices found")
        return devices
    
    def determine_network_topology(self) -> Dict[str, Any]:
        """Analyze traceroute data to determine network structure."""
        print("\n🗺️  Analyzing network topology...")
        
        topology = {
            'gateway': None,
            'switches': [],
            'routers': [],
            'endpoints': [],
            'access_points': [],
            'connections': []
        }
        
        # Identify gateway
        network_info = self.scan_metadata.get('network_info', {})
        if 'gateway' in network_info:
            topology['gateway'] = network_info['gateway']
        
        # Categorize devices
        for ip, device in self.discovered_devices.items():
            device_type = device.get('device_type', 'unknown')
            
            if device_type in ['router', 'firewall']:
                topology['routers'].append(ip)
            elif device_type in ['switch']:
                topology['switches'].append(ip)
            elif device_type in ['WAP', 'wireless-access-point']:
                topology['access_points'].append(ip)
            else:
                # Check services to infer device type
                services = device.get('services', [])
                service_names = [s.get('service', '') for s in services]
                
                if any(s in ['http', 'https', 'upnp'] for s in service_names):
                    # Could be router/access point
                    if device.get('os_detection', {}).get('vendor', '').lower() in ['cisco', 'juniper', 'mikrotik', 'ubiquiti']:
                        topology['routers'].append(ip)
                    else:
                        topology['endpoints'].append(ip)
                else:
                    topology['endpoints'].append(ip)
            
            # Analyze traceroute for connections
            traceroute = device.get('traceroute', [])
            if traceroute:
                prev_hop = None
                for hop in traceroute:
                    hop_ip = hop.get('ip')
                    if hop_ip and prev_hop:
                        connection = {
                            'from': prev_hop,
                            'to': hop_ip,
                            'type': 'l3_route'
                        }
                        if connection not in topology['connections']:
                            topology['connections'].append(connection)
                    prev_hop = hop_ip
                
                # Connect last hop to target
                if prev_hop and prev_hop != ip:
                    topology['connections'].append({
                        'from': prev_hop,
                        'to': ip,
                        'type': 'l3_route'
                    })
        
        return topology
    
    def generate_containerlab_format(self) -> Dict[str, Any]:
        """Generate containerlab-compatible topology definition."""
        
        clab_topology = {
            'name': 'inspector-twin-network',
            'topology': {
                'nodes': {},
                'links': []
            }
        }
        
        # Map discovered devices to containerlab nodes
        for ip, device in self.discovered_devices.items():
            node_name = f"node_{ip.replace('.', '_')}"
            
            # Determine container image based on device type
            device_type = device.get('device_type', 'unknown')
            os_name = device.get('os_detection', {}).get('name', '').lower()
            
            kind = 'linux'
            image = 'alpine:latest'
            
            if 'router' in device_type or 'cisco' in os_name:
                kind = 'vr-sros'  # Or 'vr-csr' for Cisco
                image = 'vrnetlab/vr-sros:latest'
            elif 'switch' in device_type:
                kind = 'ovs-bridge'
                image = 'networkop/ovs:latest'
            elif 'windows' in os_name:
                kind = 'linux'
                image = 'winamd64/windows:latest'
            elif 'linux' in os_name:
                kind = 'linux'
                image = 'ubuntu:latest'
            
            clab_topology['topology']['nodes'][node_name] = {
                'kind': kind,
                'image': image,
                'mgmt_ipv4': ip,
                'ports': [p['port'] for p in device.get('ports', [])],
                'labels': {
                    'discovered_mac': device.get('mac', ''),
                    'discovered_os': device.get('os_detection', {}).get('name', ''),
                    'device_type': device_type
                }
            }
        
        # Generate links from topology connections
        topology = self.scan_metadata.get('topology', {})
        for idx, conn in enumerate(topology.get('connections', [])):
            clab_topology['topology']['links'].append({
                'endpoints': [
                    f"node_{conn['from'].replace('.', '_')}:eth{idx}",
                    f"node_{conn['to'].replace('.', '_')}:eth{idx}"
                ]
            })
        
        return clab_topology
    
    def generate_docker_compose_format(self) -> Dict[str, Any]:
        """Generate docker-compose compatible format."""
        
        compose = {
            'version': '3.8',
            'services': {},
            'networks': {
                'inspector_network': {
                    'driver': 'bridge',
                    'ipam': {
                        'config': [
                            {'subnet': self.scan_metadata.get('network_info', {}).get('network_cidr', '192.168.1.0/24')}
                        ]
                    }
                }
            }
        }
        
        # Map each device to a Docker service
        for ip, device in self.discovered_devices.items():
            service_name = f"node_{ip.replace('.', '_')}"
            
            os_name = device.get('os_detection', {}).get('name', '').lower()
            
            # Choose appropriate image
            if 'linux' in os_name:
                image = 'ubuntu:latest'
            elif 'windows' in os_name:
                image = 'mcr.microsoft.com/windows/servercore:ltsc2022'
            else:
                image = 'alpine:latest'
            
            compose['services'][service_name] = {
                'image': image,
                'container_name': service_name,
                'hostname': device.get('hostname', service_name),
                'networks': {
                    'inspector_network': {
                        'ipv4_address': ip
                    }
                },
                'labels': {
                    'inspector.device_type': device.get('device_type', 'unknown'),
                    'inspector.mac': device.get('mac', ''),
                    'inspector.os': device.get('os_detection', {}).get('name', ''),
                },
                'ports': [f"{p['port']}:{p['port']}" for p in device.get('ports', [])[:10]],  # Limit exposed ports
            }
        
        return compose
    
    def scan_network(self):
        """Main scanning orchestration."""
        print("\n" + "="*60)
        print("🔍 NETWORK TOPOLOGY MAPPER")
        print("="*60)
        
        # Get network info
        print("\n📡 Detecting network configuration...")
        network_info = self.get_local_network_info()
        self.scan_metadata['network_info'] = network_info
        
        print(f"  Local IP: {network_info.get('local_ip', 'unknown')}")
        print(f"  Gateway: {network_info.get('gateway', 'unknown')}")
        print(f"  Network: {network_info.get('network_cidr', 'unknown')}")
        
        network_cidr = network_info.get('network_cidr')
        if not network_cidr:
            print("❌ Could not determine network CIDR")
            return False
        
        # ARP scan
        arp_devices = self.arp_scan(network_cidr)
        
        # Bluetooth scan
        bt_devices = self.bluetooth_scan()
        self.scan_metadata['bluetooth_devices'] = bt_devices
        
        # Intensive nmap scan on each discovered device
        print(f"\n🔬 Performing intensive nmap scans on {len(arp_devices)} devices...")
        print(f"⏱️  This may take a while (timeout per host: {self.nmap_timeout}s)...\n")

        if self.nmap_parallelism <= 1 or len(arp_devices) <= 1:
            for idx, device in enumerate(arp_devices, 1):
                ip = device['ip']
                print(f"[{idx}/{len(arp_devices)}] Scanning {ip}")
                device_info = self.intensive_nmap_scan(ip)
                device_info['mac'] = device.get('mac', '')
                device_info['discovered_by'] = device.get('discovered_by', '')
                self.discovered_devices[ip] = device_info
        else:
            print(f"⚡ Parallel scan enabled: {self.nmap_parallelism} workers")
            device_map = {device['ip']: device for device in arp_devices}
            with ThreadPoolExecutor(max_workers=self.nmap_parallelism) as executor:
                futures = {
                    executor.submit(self.intensive_nmap_scan, ip): ip
                    for ip in device_map.keys()
                }
                completed = 0
                total = len(futures)
                for future in as_completed(futures):
                    ip = futures[future]
                    completed += 1
                    print(f"[{completed}/{total}] Completed {ip}")
                    try:
                        device_info = future.result()
                    except Exception as e:
                        print(f"    ⚠️  Scan failed for {ip}: {e}")
                        device_info = {
                            'ip': ip,
                            'scan_time': datetime.now().isoformat(),
                            'ports': [],
                            'services': [],
                            'os_detection': {},
                            'device_type': 'unknown',
                            'distance_hops': None,
                            'scan_error': str(e),
                        }
                    device = device_map[ip]
                    device_info['mac'] = device.get('mac', '')
                    device_info['discovered_by'] = device.get('discovered_by', '')
                    self.discovered_devices[ip] = device_info
        
        # Analyze topology
        topology = self.determine_network_topology()
        self.scan_metadata['topology'] = topology
        
        print(f"\n📊 Topology Summary:")
        print(f"  Gateway: {topology['gateway']}")
        print(f"  Routers: {len(topology['routers'])}")
        print(f"  Switches: {len(topology['switches'])}")
        print(f"  Access Points: {len(topology['access_points'])}")
        print(f"  Endpoints: {len(topology['endpoints'])}")
        print(f"  Connections: {len(topology['connections'])}")
        
        return True
    
    def save_results(self):
        """Save all results to JSON file."""
        print(f"\n💾 Saving results to {self.output_file}...")
        
        output = {
            'metadata': self.scan_metadata,
            'devices': self.discovered_devices,
            'topology': self.scan_metadata.get('topology', {}),
            'bluetooth_devices': self.scan_metadata.get('bluetooth_devices', []),
            'containerlab_format': self.generate_containerlab_format(),
            'docker_compose_format': self.generate_docker_compose_format()
        }
        
        output_path = Path(self.output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"✅ Results saved to {output_path.absolute()}")
        print(f"📦 Total devices discovered: {len(self.discovered_devices)}")
        print(f"📦 Bluetooth devices: {len(self.scan_metadata.get('bluetooth_devices', []))}")
        
        # Also save containerlab and docker-compose files separately
        clab_file = output_path.parent / f"{output_path.stem}-containerlab.yml"
        compose_file = output_path.parent / f"{output_path.stem}-docker-compose.yml"
        
        # Save as YAML (using json for simplicity, could use PyYAML)
        import yaml
        try:
            with open(clab_file, 'w') as f:
                yaml.dump(output['containerlab_format'], f, default_flow_style=False)
            print(f"📦 Containerlab config: {clab_file}")
        except:
            print(f"⚠️  Could not save YAML (install PyYAML): {clab_file}")
        
        try:
            with open(compose_file, 'w') as f:
                yaml.dump(output['docker_compose_format'], f, default_flow_style=False)
            print(f"📦 Docker Compose config: {compose_file}")
        except:
            print(f"⚠️  Could not save YAML (install PyYAML): {compose_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Network Topology Mapper - Comprehensive network reconnaissance and topology mapping',
        epilog='Requires root/sudo privileges for raw socket operations. For authorized local testing only.'
    )
    parser.add_argument(
        '-o', '--output',
        default='network-topology.json',
        help='Output JSON file path (default: network-topology.json)'
    )
    parser.add_argument(
        '-i', '--interface',
        help='Network interface to scan (default: auto-detect)'
    )
    parser.add_argument(
        '--skip-prereq-check',
        action='store_true',
        help='Skip prerequisite checks (not recommended)'
    )
    parser.add_argument(
        '--nmap-timeout',
        type=int,
        default=900,
        help='Max per-host nmap scan time in seconds (default: 900)'
    )
    parser.add_argument(
        '--nmap-parallel',
        type=int,
        default=6,
        help='Parallel nmap workers for host scans (default: 6)'
    )
    parser.add_argument(
        '--nmap-min-rate',
        type=int,
        default=300,
        help='Minimum nmap packet rate (packets/second, default: 300)'
    )
    parser.add_argument(
        '--nmap-max-retries',
        type=int,
        default=2,
        help='Max nmap probe retransmissions (default: 2)'
    )
    parser.add_argument(
        '--nmap-min-parallelism',
        type=int,
        default=None,
        help='Minimum Nmap probe parallelism (per host group)'
    )
    parser.add_argument(
        '--nmap-max-parallelism',
        type=int,
        default=None,
        help='Maximum Nmap probe parallelism (per host group)'
    )
    parser.add_argument(
        '--nmap-initial-rtt',
        type=str,
        default='250ms',
        help='Initial RTT timeout (default: 250ms)'
    )
    parser.add_argument(
        '--nmap-max-rtt',
        type=str,
        default='1000ms',
        help='Max RTT timeout (default: 1000ms)'
    )
    parser.add_argument(
        '--assume-yes',
        action='store_true',
        help='Assume yes for prompts (non-interactive use)'
    )
    
    args = parser.parse_args()
    
    def confirm_or_exit(prompt, expected, assume_yes=False):
        if assume_yes:
            return
        if not sys.stdin.isatty():
            print("Non-interactive session without --assume-yes. Aborting.")
            sys.exit(1)
        response = input(prompt)
        if response.strip().lower() != expected:
            print("Scan cancelled.")
            sys.exit(0)

    # Check if running as root
    import os
    if os.geteuid() != 0:
        print("⚠️  WARNING: Not running as root. Some scans may fail.")
        print("    Run with: sudo python3 network-topology-mapper.py")
        if args.assume_yes:
            print("Proceeding due to --assume-yes.")
        else:
            if not sys.stdin.isatty():
                print("Non-interactive session without --assume-yes. Aborting.")
                sys.exit(1)
            response = input("Continue anyway? (y/N): ")
            if response.lower() != 'y':
                sys.exit(1)
    
    mapper = NetworkTopologyMapper(
        output_file=args.output,
        interface=args.interface,
        nmap_timeout=args.nmap_timeout,
        nmap_parallelism=args.nmap_parallel,
        nmap_min_rate=args.nmap_min_rate,
        nmap_max_retries=args.nmap_max_retries,
        nmap_min_parallelism=args.nmap_min_parallelism,
        nmap_max_parallelism=args.nmap_max_parallelism,
        nmap_initial_rtt=args.nmap_initial_rtt,
        nmap_max_rtt=args.nmap_max_rtt
    )
    
    # Check prerequisites
    if not args.skip_prereq_check:
        if not mapper.check_prerequisites():
            print("\n❌ Prerequisites check failed. Install missing tools or use --skip-prereq-check")
            sys.exit(1)
    
    print("\n⚠️  AUTHORIZATION NOTICE")
    print("This tool performs intensive network reconnaissance.")
    print("Only use on networks you own or have explicit written permission to test.")
    confirm_or_exit("\nI confirm I am authorized to scan this network (yes/no): ", "yes", args.assume_yes)
    
    # Run scan
    try:
        success = mapper.scan_network()
        if success:
            mapper.save_results()
            print("\n✅ Network topology mapping complete!")
            return 0
        else:
            print("\n❌ Scan failed")
            return 1
    except KeyboardInterrupt:
        print("\n\n⚠️  Scan interrupted by user")
        return 130
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
