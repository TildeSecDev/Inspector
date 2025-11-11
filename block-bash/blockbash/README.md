# Inspector

Inspector is a comprehensive gamified cybersecurity education platform that combines visual programming, interactive workshops, and real terminal environments to teach hacking and core cybersecurity principles. Built on Node.js/Express, it provides an immersive learning experience through multiple integrated systems focused on practical penetration testing and network security skills.

## 🏗️ Platform Architecture

Inspector offers three distinct but interconnected learning environments:

- **Block Editor**: Visual programming interface with drag-and-drop cybersecurity command blocks
- **Network Topology Designer**: Interactive network visualization and configuration tool with security assessment capabilities
- **Workshop System**: Immersive story-driven learning modules with RPG elements and real-world scenario simulations

The platform is built with a modular Express.js backend featuring:

- RESTful API architecture with WebSocket support for real-time terminal interaction
- SQLite database with planned MongoDB migration for scalability
- Sandboxed terminal execution environment with node-pty integration
- Comprehensive packet capture and network analysis capabilities via tshark integration

## 🎮 Core Features

### Interactive Workshop System

- **Story-based Learning**: Multi-chapter adventures like "Mira's Story" (5-chapter wireless security saga) and "DemoRPG: Cave Bash"
- **Progressive Skill Building**: 50+ achievements covering 15+ cybersecurity domains including network enumeration, web security, database security, wireless hacking, password attacks, forensics, and social engineering
- **Real-time Validation**: Command validation system with immediate feedback, hints, and step-by-step progression
- **Multiple Learning Modes**: RPG mode for story-driven learning, Task mode for focused skill practice, and hands-on laboratory exercises

### Block-Based Visual Editor

- **Cybersecurity Blocks**: Pre-built command blocks for network scanning, vulnerability assessment, penetration testing, and security tool integration
- **Professional Tool Integration**: Visual blocks for industry-standard tools including:
  - **Reconnaissance**: Nmap, Masscan, ARP-scan, Netdiscover
  - **Web Security**: Burp Suite, OWASP ZAP, SQLMap, Dirb
  - **Network Analysis**: Wireshark, Tcpdump, Tshark with live packet capture
  - **Exploitation**: Metasploit Framework, SearchSploit, Custom payload generation
  - **Wireless Security**: Aircrack-ng suite, WiFi Pineapple simulation
  - **Password Attacks**: Hydra, John the Ripper, Hashcat, Rainbow tables
  - **Social Engineering**: SET (Social Engineering Toolkit), Phishing simulations
  - **OSINT**: Maltego, Shodan integration, Information gathering
- **Drag-and-Drop Interface**: Visual programming environment for building complex security assessment workflows
- **Live Code Generation**: Automatic translation of visual blocks to executable bash commands with parameter validation
- **Educational Tooltips**: Built-in learning aids explaining security concepts, command usage, and attack methodologies

### Network Topology Designer

- **Visual Network Mapping**: Interactive canvas for designing and visualizing network architectures with security context
- **Security Analysis**: Tools for identifying potential attack vectors, network vulnerabilities, and security gaps
- **Real-time Configuration**: Live network simulation and configuration testing with vulnerability assessment
- **Professional Device Simulation**: Virtual representations of routers, switches, firewalls, IDS/IPS, and security appliances

### Terminal Integration & Security

- **Multiple Sessions**: Support for concurrent terminal sessions with isolated environments and user sandboxing
- **User Isolation**: Sandboxed file systems preventing directory traversal, privilege escalation, and system compromise
- **Command Filtering**: Configurable banned command list for security and educational control with real-time monitoring
- **Real Shell Environment**: Full xterm.js integration with node-pty for authentic terminal experience
- **Packet Capture Integration**: Live network packet capture and analysis through tshark with educational filtering

### User Management & Progress Tracking

- **Authentication System**: Secure user registration and login with bcrypt password hashing and session management
- **Progress Persistence**: SQLite database storing user achievements, workshop progress, session data, and skill progression
- **User Profiles**: Customizable profiles with avatar upload, statistics tracking, and competency mapping
- **Social Features**: Friend system, leaderboards, collaborative learning elements, and team challenges

### Comprehensive Achievement System

- **50+ Security-focused Achievements** spanning critical cybersecurity domains:

  **Information Gathering & Reconnaissance**:

  - Network Enumerator (ARP scanning, ping sweeps)
  - Gateway Sleuth (port scanning, service identification)
  - SSID Cartographer (wireless network mapping)
  - MAC Mapper (device enumeration)
  - Port Sleuth (comprehensive port scanning)
  - Service Profiler (banner grabbing, version detection)

  **Web Application Security**:

  - Injection Investigator (SQL injection testing)
  - Traversal Tracker (directory traversal testing)
  - SSL Auditor (certificate and cipher analysis)
  - Header Guardian (HTTP security header validation)
  - XSS Defender (cross-site scripting protection)

  **Database Security**:

  - Schema Explorer (database enumeration)
  - Credential Cracker (authentication testing)
  - SQL Injection Prober (advanced SQLi techniques)

  **Wireless Security & Network Attacks**:

  - Monitor Mode Master (wireless interface management)
  - Beacon Auditor (802.11 beacon frame analysis)
  - Handshake Verifier (WPA2 handshake capture)
  - DHCP Detective (rogue DHCP server detection)
  - DNS Analyst (DNS poisoning detection)
  - ARP Attacker (man-in-the-middle attacks)
  - MITM Operative (traffic interception)
  - Whitelist Champion (MAC ACL management)

  **Password Attacks & Cryptography**:

  - Brute Force Breaker (password brute-forcing)
  - Dictionary Diver (wordlist attacks)
  - Hash Hacker (password hash cracking)
  - Rainbow Raider (rainbow table attacks)
  - Key Cracker (WPA2 PSK cracking)
  - Auth Annihilator (authentication bypass)

  **Exploitation & Penetration Testing**:

  - Shell Sniper (remote shell acquisition)
  - Exploit Explorer (vulnerability research)
  - Exploit Engineer (CVE research and exploitation)
  - Payload Pioneer (custom payload creation)
  - Privilege Escalator (local privilege escalation)

  **Digital Forensics & Analysis**:

  - Packet Collector (network traffic analysis)
  - Firmware Forager (firmware extraction and analysis)
  - Credential Seeker (embedded credential discovery)
  - Traffic Tactician (network flow analysis)

  **Social Engineering & Physical Security**:

  - Beacon Bard (Bluetooth Low Energy security)
  - USB Strategist (USB attack mitigation)

  **Defensive Security & Blue Team**:

  - SSH Stormtrooper (SSH hardening)
  - Cipher Sleuth (cryptographic analysis)
  - Gateway Guru (network infrastructure hardening)
  - Injection Artist (input validation and CSP)
- **Easter Eggs**: Hidden achievements for platform exploration, advanced technique discovery, and engagement milestones

## 📚 Workshop Content & Learning Modules

### Comprehensive Pre-built Learning Modules

**Mira's Story: Wireless Security Adventure**

- **5-Chapter Narrative**: Follow security analyst Mira through realistic wireless security scenarios
- **Progressive Skill Building**: From basic WiFi scanning to advanced attack mitigation
- **Real-world Scenarios**: Café WiFi security, rogue AP detection, enterprise wireless hardening
- **Tools Covered**: Airodump-ng, Aireplay-ng, Aircrack-ng, Wireshark, tcpdump
- **Skills Gained**: 802.11 protocol analysis, WPA2 security, beacon frame analysis, handshake capture

**DemoRPG: Cave Bash**

- **Cave Story-inspired RPG**: Interactive bash command learning through gaming mechanics
- **Progressive Difficulty**: From basic commands to advanced shell scripting
- **Achievement Integration**: Bash mastery achievements and skill progression

**Information Gathering & OSINT**

- **Comprehensive Reconnaissance**: Network enumeration, service detection, vulnerability identification
- **OSINT Techniques**: Open source intelligence gathering, social media reconnaissance
- **Tools Integration**: Nmap, Masscan, Shodan, Maltego, Google dorking

**Task Topics: Focused Skill Modules**
Covering 15+ critical cybersecurity domains:

- **Network Reconnaissance**: Host discovery, port scanning, service enumeration
- **Web Application Testing**: SQLi, XSS, CSRF, authentication bypass
- **Database Security**: Schema enumeration, credential testing, privilege escalation
- **Wireless Attacks**: Monitor mode, packet capture, WEP/WPA cracking
- **Password Attacks**: Brute force, dictionary attacks, hash cracking
- **Sniffing & Spoofing**: Packet capture, ARP spoofing, DNS manipulation
- **Social Engineering**: Phishing simulation, SET framework usage
- **Exploitation Tools**: Metasploit framework, custom payload development
- **Post Exploitation**: Persistence, privilege escalation, lateral movement
- **Forensics**: Disk imaging, network forensics, timeline analysis
- **Reverse Engineering**: Binary analysis, firmware extraction, static analysis
- **Reporting**: Professional penetration testing documentation

### Workshop Format (.cerrf/.tlds Archives)

- **Structured Learning**: JSON-defined steps with command validation, progressive hints, and detailed feedback
- **Rich Media Support**: Background images, custom CSS styling, interactive JavaScript components
- **Modular Design**: Standardized format enabling easy creation of new workshops and learning modules
- **Version Control**: Archive-based distribution ensuring consistent learning experiences across deployments
- **Validation Engine**: Advanced command validation with context-aware feedback and flag-based progression

## 🎨 User Interface

### Three-Column Layout

- **Collapsible Sidebar**: Quick access to user profile, achievements, and navigation
- **Central Workspace**: Dynamic area switching between Block Editor and Network Designer
- **Workshop Panel**: Resizable panel displaying active learning content and progress
- **Responsive Design**: Adaptive layout supporting various screen sizes

### Theme System

- **Multiple Themes**: Professional, educational, and gamified visual styles
- **Dark/Light Modes**: User preference accommodation for extended learning sessions
- **Accessibility Features**: High contrast options and keyboard navigation support

### Real-time Feedback

- **Live Validation**: Immediate command output analysis and step completion detection
- **Progress Indicators**: Visual progress bars, step counters, and achievement notifications
- **Interactive Hints**: Context-sensitive help system guiding learners through challenges

## 🔧 Technical Implementation

### Backend Infrastructure

- **Express.js Server**: RESTful API with WebSocket support for real-time communication
- **SQLite Database**: User data, progress tracking, and workshop metadata storage
- **Node-PTY Integration**: Real terminal processes with full shell environment simulation
- **File System Isolation**: Per-user directories preventing cross-contamination
- **Workshop Loading**: Dynamic .cerrf/.tlds archive processing and content delivery

### Modular Backend Structure (Updated)

The backend has been refactored into discrete route and middleware modules under `backend/`:

- `backend/app.js` – Core Express instance, WebSocket routes (`/run`, `/sandbox/exec`), validation endpoints.
- `backend/routes/auth.js` – Registration, login, logout, password reset.
- `backend/routes/admin.js` – User/org management & telemetry (active sessions, recent commands, containers) with role guards.
- `backend/routes/progress.js` – RPG/workshop progress & achievements persistence.
- `backend/routes/user.js` – Preferred OS, notifications, profile picture, user progress read.
- `backend/routes/workshop.js` – Workshop archive & asset delivery.
- `backend/middleware/auth.js` – User attachment & role-based access control helpers.
- `backend/middleware/security.js` – Security helpers (banned command checks).

State exported for telemetry:
`activeSessions`, `recentCommands`, `userActivities` (from `backend/app.js`).

Testing additions:
- Jest + Supertest integration test (`npm run test:auth`) exercises `/auth/register` & `/auth/login`.
- WebSocket smoke tests can be scripted with `ws` client (see development notes).

Authentication guard:
- `/sandbox/exec` WebSocket now requires an authenticated `username` cookie and closes immediately if absent (`{ type: 'error', error: 'not_authenticated' }`).

Planned next hardening steps:
- Replace in-memory sessions with Redis.
- Add JWT/session middleware and CSRF defenses.
- Expand banned command logic to sandbox policy engine.

### Authentication (PASETO v2.public)

The platform now uses real PASETO v2.public tokens (access + refresh) implemented in `backend/security/pasetoUtil.js`.

Key points:
- Single persistent secret key (public-mode signing key bytes) stored base64 at `backend/security/keys/v2-public-secret.b64` (auto-created on first run)
- Access tokens: 15m TTL (default). Refresh tokens: 7d TTL (default)
- Claims include: `sub` (user id/email), `name`, optional `admin`, `kind` ("refresh" for refresh tokens), `iat`, `exp`
- Verification enforces expiration; rotation invalidates the previous refresh token immediately
- Refresh token persistence: SQLite table `refresh_tokens` (token, user_email, created_at, expires, revoked flag)

Rotation Flow:
1. User authenticates -> access + refresh pair issued; refresh stored in DB
2. Client calls `/auth/refresh` with current refresh cookie
3. Server verifies signature + DB validity (not revoked, not expired)
4. New access + refresh tokens issued; old refresh marked revoked
5. Reuse of revoked refresh => 401 `revoked`

Maintenance:
- Prune script: `node backend/security/pruneRefreshTokens.js` removes expired and long‑revoked rows (default retention 7 days; configure with `PRUNE_MAX_REVOKED_AGE_MS`)
- Future: key rotation & dual validation window

Testing:
- `tests/refresh.integration.test.js` validates rotation semantics (pass)
- `tests/tokenUtil.test.js` pending update to reflect PASETO tamper/expiry cases (still references earlier HMAC interim design)

### Frontend Architecture

- **Vanilla JavaScript**: Lightweight, dependency-free client-side implementation
- **WebSocket Communication**: Real-time terminal I/O and progress synchronization
- **Modular Components**: Separate systems for blocks, network designer, and workshops
- **Local Storage**: Client-side preference and session state persistence

### Security Features

- **Command Filtering**: Configurable blacklist preventing dangerous operations
- **Directory Traversal Protection**: Restricted file system access within user boundaries
- **Session Isolation**: Individual user environments preventing interference
- **Input Validation**: Server-side validation of all user inputs and commands

## 🚀 Installation & Setup

### Prerequisites

- Node.js 16+
- npm or yarn package manager
- SQLite3 (included in dependencies)

### Quick Start

1. **Install Dependencies**:

   ```bash
   npm install
   ```
2. **Initialize Database**:

   ```bash
   ./start_mongo.sh  # Creates SQLite database and tables
   ```
3. **Start Server**:

   ```bash
   npm start
   # or
   node app.js
   ```
4. **Access Platform**:

   - Main Editor: http://localhost:3000/editor
   - Landing Page: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

### Development Mode

```bash
# Run with file watching
npm run dev

# Test PTY functionality
npm test
```

### Optional: Windows Remote Runner (SSH PowerShell)

Enable multi-OS execution by connecting to a remote Windows host that has the OpenSSH Server feature enabled. The platform will treat this remote host as a "windows" execution target.

Environment variables (one of PASS/KEY required):

| Variable | Required | Description |
|----------|----------|-------------|
| WIN_SSH_HOST | Yes | Windows host/IP running OpenSSH Server |
| WIN_SSH_USER | Yes | User for SSH login (must have PowerShell access) |
| WIN_SSH_PASS | One of | Password for the user (omit if using key) |
| WIN_SSH_KEY  | One of | Path to private key for key-based auth |
| WIN_SSH_PORT | No | SSH port (default 22) |

Example (password auth):

```bash
export WIN_SSH_HOST=10.0.0.25
export WIN_SSH_USER=student
export WIN_SSH_PASS='P@ssw0rd!'
npm test -- test/windows_runner.test.js
```

Example (key auth):

```bash
export WIN_SSH_HOST=10.0.0.25
export WIN_SSH_USER=student
export WIN_SSH_KEY=~/.ssh/id_rsa
npm test -- test/windows_runner.test.js
```

Test file `test/windows_runner.test.js` auto-skips if the variables aren't set. On success it validates a PowerShell `Write-Output` round trip.

Notes:
- Commands run via `powershell -NoLogo -NoProfile -Command "<cmd>"` over SSH.
- Output is streamed into existing terminal infrastructure.
- Future: optional WinRM transport or native Windows container support when host permits.
- If both WIN_SSH_PASS and WIN_SSH_KEY are provided, key auth is preferred.

#### WinRM (HTTP/HTTPS) Mode

If you have a Windows host with WinRM enabled (basic auth over HTTP for lab networks or HTTPS with a certificate), you can set:

```bash
export WINRM_HOST=10.0.0.30
export WINRM_USER=student
export WINRM_PASS='P@ssw0rd!'
# optional:
export WINRM_PORT=5985          # 5986 for HTTPS
export WINRM_SSL=0              # set to 1 for HTTPS
export WINRM_ALLOW_INSECURE=1   # allow self-signed / invalid cert when SSL=1
```

When `WINRM_HOST` is present the runner prefers WinRM over SSH. A selenium test (`test/selenium/windows_winrm_exec.test.js`) can be invoked (ensure server running):

```bash
node test/selenium/windows_winrm_exec.test.js
```



## 📊 API Endpoints

### Workshop System

- `GET /ws/workshop?lesson_id={id}` - Load workshop content
- `POST /ws/validate` - Validate command output against workshop requirements
- `GET/POST /ws/progress` - User progress tracking and achievement management
- `GET /ws/list_topics` - Available workshop topics

### User Management

- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/logout` - Session termination
- `GET /user/profile` - User profile and statistics
- `POST /user/settings` - Profile updates
- `GET /leaderboard` - Global achievement rankings

### Administrative

- `GET /admin/users` - User management interface
- `GET /admin/ipam` - IP address management
- `GET /debug/sqlite` - Database health check

## 🔮 Planned Enhancements

### MongoDB Migration

- **Scalable Data Storage**: Migration from SQLite to MongoDB for improved performance
- **Advanced Analytics**: User behavior tracking and learning pattern analysis
- **Real-time Collaboration**: Multi-user workshop sessions and team challenges

### Advanced Workshop Features

- **Dynamic Difficulty**: Adaptive challenge complexity based on user performance
- **Custom Workshop Creator**: Visual tools for educators to build custom learning modules
- **Integration APIs**: Webhook system for external learning management system integration

### Enhanced Security Training

- **Live Vulnerability Labs**: Real-world environment simulation with actual vulnerable systems
- **Red Team Exercises**: Advanced multi-stage attack simulations
- **Blue Team Scenarios**: Defensive cybersecurity training modules

### Platform Expansion

- **Mobile Application**: Native mobile app for on-the-go learning
- **Certification Integration**: Alignment with industry certification standards (CEH, CISSP, etc.)
- **Enterprise Features**: Multi-tenant support for educational institutions and organizations

## 🤝 Contributing

Inspector welcomes contributions from the cybersecurity education community:

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

## 📄 License

This project is part of the TildeSec educational initiative. See LICENSE file for details.

## 🔗 Additional Resources

- **Workshop Creation Guide**: `docs/cerrf_workshop_loading.md`
- **API Documentation**: Available in `/docs` directory
- **Example Workshops**: Explore `/examples` for workshop structure references
- **Community Forum**: [Link to community discussions]

---

*Inspector: Making cybersecurity education interactive, engaging, and accessible to learners worldwide.*
