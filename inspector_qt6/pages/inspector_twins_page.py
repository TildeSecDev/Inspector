"""Inspector Twins Page - AI Models for Digital Twin Assessment and Testing"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QScrollArea,
    QFrame, QGridLayout
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont, QIcon


class AIModelCard(QFrame):
    """Card widget for displaying an AI model"""
    
    deploy_clicked = pyqtSignal(str)  # Emit model_id
    
    def __init__(self, model_id: str, name: str, description: str, 
                 capabilities: list, version: str):
        super().__init__()
        self.model_id = model_id
        self.name = name
        self.description = description
        self.capabilities = capabilities
        self.version = version
        self.init_ui()
    
    def init_ui(self):
        """Initialize the card UI"""
        self.setFrameStyle(QFrame.Shape.StyledPanel | QFrame.Shadow.Raised)
        self.setLineWidth(2)
        self.setStyleSheet("""
            AIModelCard {
                background-color: #2c2c2c;
                border: 2px solid #3498db;
                border-radius: 8px;
                padding: 15px;
            }
            AIModelCard:hover {
                border-color: #2ecc71;
                background-color: #323232;
            }
        """)
        
        layout = QVBoxLayout(self)
        layout.setSpacing(12)
        
        # Header with model name and version
        header_layout = QHBoxLayout()
        header_layout.setSpacing(10)
        
        name_label = QLabel(self.name)
        name_label.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        header_layout.addWidget(name_label)
        
        header_layout.addStretch()
        
        version_label = QLabel(f"v{self.version}")
        version_label.setFont(QFont("Arial", 10))
        header_layout.addWidget(version_label)
        
        layout.addLayout(header_layout)
        
        # Description
        desc_label = QLabel(self.description)
        desc_label.setWordWrap(True)
        layout.addWidget(desc_label)
        
        # Capabilities
        if self.capabilities:
            capabilities_label = QLabel("Capabilities:")
            layout.addWidget(capabilities_label)
            
            caps_layout = QHBoxLayout()
            caps_layout.setSpacing(8)
            caps_layout.setContentsMargins(0, 0, 0, 0)
            
            for cap in self.capabilities[:3]:  # Show first 3
                cap_label = QLabel(f"• {cap}")
                caps_layout.addWidget(cap_label)
            
            if len(self.capabilities) > 3:
                more_label = QLabel(f"+ {len(self.capabilities) - 3} more")
                caps_layout.addWidget(more_label)
            
            caps_layout.addStretch()
            layout.addLayout(caps_layout)
        
        # Deploy button
        deploy_btn = QPushButton("🚀 Deploy to Project")
        deploy_btn.setMinimumHeight(35)
        deploy_btn.setStyleSheet("""
            QPushButton {
                background-color: #27ae60;
                color: white;
                font-weight: bold;
                font-size: 12px;
                border: none;
                border-radius: 5px;
                padding: 8px;
            }
            QPushButton:hover {
                background-color: #2ecc71;
            }
            QPushButton:pressed {
                background-color: #229954;
            }
        """)
        deploy_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        deploy_btn.clicked.connect(lambda: self.deploy_clicked.emit(self.model_id))
        layout.addWidget(deploy_btn)


class InspectorTwinsPage(QWidget):
    """Page displaying available HRH AI models for Digital Twin assessment and testing"""
    
    model_deployed = pyqtSignal(str)  # Emit model_id when a model is deployed
    
    def __init__(self):
        super().__init__()
        self.ai_models = self._get_available_models()
        self.init_ui()
    
    def _get_available_models(self) -> list:
        """Get list of available AI models for assessment and testing"""
        return [
            {
                "id": "hrh-vulnerability-scanner",
                "name": "HRH Vulnerability Scanner",
                "description": "Automated vulnerability assessment tool that scans network topologies for security weaknesses, misconfigurations, and potential attack vectors.",
                "capabilities": [
                    "CVE Detection",
                    "Misconfig Analysis",
                    "Attack Path Mapping",
                    "Risk Scoring",
                    "Real-time Monitoring"
                ],
                "version": "2.1.0"
            },
            {
                "id": "hrh-behavioral-anomaly-detector",
                "name": "HRH Behavioral Anomaly Detector",
                "description": "Machine learning model that learns normal network behavior patterns and detects unusual activities, potential breaches, and anomalous traffic patterns.",
                "capabilities": [
                    "Behavioral Learning",
                    "Anomaly Detection",
                    "Threat Detection",
                    "Pattern Analysis",
                    "Alert Generation"
                ],
                "version": "1.8.2"
            },
            {
                "id": "hrh-network-simulation-tester",
                "name": "HRH Network Simulation Tester",
                "description": "Comprehensive testing suite that executes automated test scenarios, stress tests, and failure simulations against digital twin topologies.",
                "capabilities": [
                    "Stress Testing",
                    "Failover Testing",
                    "Load Balancing Tests",
                    "Latency Simulation",
                    "Packet Loss Injection"
                ],
                "version": "2.0.1"
            },
            {
                "id": "hrh-compliance-auditor",
                "name": "HRH Compliance Auditor",
                "description": "Evaluates network configurations against NIST, CIS, PCI-DSS, and other compliance frameworks to ensure adherence to security standards.",
                "capabilities": [
                    "NIST Compliance",
                    "CIS Benchmarks",
                    "PCI-DSS Validation",
                    "HIPAA Checking",
                    "Report Generation"
                ],
                "version": "1.5.3"
            },
            {
                "id": "hrh-threat-intelligence",
                "name": "HRH Threat Intelligence Engine",
                "description": "Real-time threat intelligence system that correlates network data with global threat databases to identify and prioritize actual threats.",
                "capabilities": [
                    "Threat Correlation",
                    "IOC Matching",
                    "Threat Ranking",
                    "Historical Analysis",
                    "Predictive Alerting"
                ],
                "version": "3.0.0"
            },
            {
                "id": "hrh-performance-optimizer",
                "name": "HRH Performance Optimizer",
                "description": "Analyzes network topology and configurations to provide recommendations for performance improvements, optimization, and resource efficiency.",
                "capabilities": [
                    "Perf Analysis",
                    "Bottleneck Detection",
                    "Resource Optimization",
                    "QoS Tuning",
                    "Cost Reduction"
                ],
                "version": "1.3.5"
            },
            {
                "id": "hrh-incident-response",
                "name": "HRH Incident Responder",
                "description": "Automated incident response orchestrator that executes pre-defined playbooks, isolates compromised segments, and coordinates containment actions.",
                "capabilities": [
                    "Incident Detection",
                    "Auto Isolation",
                    "Playbook Execution",
                    "Root Cause Analysis",
                    "Recovery Automation"
                ],
                "version": "1.9.0"
            },
            {
                "id": "hrh-network-mapper",
                "name": "HRH Network Dependency Mapper",
                "description": "Maps service dependencies, creates relationship graphs, and identifies critical infrastructure components and single points of failure.",
                "capabilities": [
                    "Dependency Mapping",
                    "Service Graphs",
                    "SPOF Detection",
                    "Impact Analysis",
                    "Visualization"
                ],
                "version": "2.2.1"
            }
        ]
    
    def init_ui(self):
        """Initialize the page UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(20)
        
        # Header
        header_label = QLabel("Inspector Twins - AI Models")
        header_font = QFont("Arial", 24, QFont.Weight.Bold)
        header_label.setFont(header_font)
        layout.addWidget(header_label)
        
        # Subtitle
        subtitle_label = QLabel(
            "Deploy HRH AI models to assess your Digital Twins, automate testing, "
            "and evaluate security posture"
        )
        subtitle_label.setWordWrap(True)
        layout.addWidget(subtitle_label)
        
        # Scroll area for model cards
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setStyleSheet("""
            QScrollArea {
                background-color: #1e1e1e;
                border: none;
            }
            QScrollBar:vertical {
                background-color: #2c2c2c;
                width: 12px;
                border-radius: 6px;
            }
            QScrollBar::handle:vertical {
                background-color: #555555;
                border-radius: 6px;
            }
            QScrollBar::handle:vertical:hover {
                background-color: #3498db;
            }
        """)
        
        # Grid layout for model cards
        content_widget = QWidget()
        content_layout = QGridLayout(content_widget)
        content_layout.setSpacing(15)
        content_layout.setContentsMargins(0, 0, 0, 0)
        
        # Add model cards to grid (2 columns)
        for idx, model in enumerate(self.ai_models):
            card = AIModelCard(
                model["id"],
                model["name"],
                model["description"],
                model["capabilities"],
                model["version"]
            )
            card.deploy_clicked.connect(self._on_deploy_model)
            
            row = idx // 2
            col = idx % 2
            content_layout.addWidget(card, row, col)
        
        scroll.setWidget(content_widget)
        layout.addWidget(scroll, stretch=1)
        
        # Set background
    
    def _on_deploy_model(self, model_id: str):
        """Handle model deployment"""
        model = next((m for m in self.ai_models if m["id"] == model_id), None)
        if model:
            # Emit signal that model was selected for deployment
            self.model_deployed.emit(model_id)
            # TODO: Show dialog to select project and configure deployment
            from PyQt6.QtWidgets import QMessageBox
            QMessageBox.information(
                self,
                "Model Deploy Intent Confirmed",
                f"Selected {model['name']} for deployment.\n\n"
                f"Next step: Select a project and configure the model parameters."
            )
