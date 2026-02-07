import { useState } from "react";
import { 
  Network, Server, Cloud, Globe, Shield, Copy, Check, 
  Router, Monitor, Users, ExternalLink, Lock, Wifi,
  Terminal, Key, ArrowRight, ArrowDown,
  Database, Activity, HardDrive, Cpu, AlertTriangle, RefreshCw,
  GitBranch
} from "lucide-react";
import { DataFlowDiagram } from "../../components/DataFlowDiagram";

// ============================================================================
// INFRASTRUCTURE DATA - Single source of truth
// ============================================================================

const infrastructure = {
  // External Services
  cloudflare: {
    name: "Cloudflare",
    type: "edge",
    services: [
      { name: "Pages", desc: "Frontend hosting", url: "guardquote.vandine.us" },
      { name: "Workers", desc: "API Gateway", url: "guardquote-gateway" },
      { name: "Tunnel", desc: "Secure ingress", id: "153cc7a6-..." },
      { name: "Access", desc: "Zero Trust auth", policy: "Email OTP" },
    ],
    zoneId: "2339ace064ef9b11dcdabb19b291f8aa",
    accountId: "4d417f3a3ec4796e8a89336e22b4916b",
  },

  // Tailscale Mesh
  tailscale: {
    name: "Tailscale Mesh",
    network: "100.x.x.x/8",
    nodes: [
      { name: "thinkstation", ip: "100.126.232.42", status: "online" },
      { name: "pi0", ip: "100.114.94.18", status: "online" },
      { name: "pi1", ip: "100.66.167.62", status: "offline" },
      { name: "macintosh-5", ip: "100.120.179.63", status: "offline" },
    ],
  },

  // Physical Hosts
  hosts: {
    pi0: {
      hostname: "pi0",
      role: "Monitoring & Logs",
      os: "Ubuntu 25.10",
      arch: "aarch64",
      localIp: "192.168.2.101",
      tailscaleIp: "100.114.94.18",
      sshUser: "rafaeljg",
      services: [
        { name: "LDAP (slapd)", port: 389, status: "running" },
        { name: "LAM Web UI", port: 8080, status: "running" },
        { name: "Vector", port: null, desc: "Log collector", status: "running" },
        { name: "rsyslog", port: 514, desc: "Syslog receiver", status: "running" },
        { name: "nfcapd", port: 2055, desc: "NetFlow", status: "error" },
        { name: "cloudflared", port: null, desc: "CF Tunnel", status: "running" },
        { name: "nettools", port: 7681, desc: "Bastion/ttyd", status: "running" },
      ],
      uptime: "7d 4h",
    },
    pi1: {
      hostname: "pi1",
      role: "Services & Apps",
      os: "Ubuntu 25.10",
      arch: "aarch64",
      localIp: "192.168.2.70",
      tailscaleIp: "100.66.167.62",
      sshUser: "johnmarston",
      services: [
        { name: "GuardQuote API", port: 3002, status: "running" },
        { name: "PostgreSQL", port: 5432, status: "running" },
        { name: "Grafana", port: 3000, status: "running" },
        { name: "Prometheus", port: 9090, status: "running" },
        { name: "Loki", port: 3100, status: "running" },
        { name: "Alertmanager", port: 9093, status: "running" },
        { name: "Node Exporter", port: 9100, status: "running" },
        { name: "SNMP Exporter", port: 9116, desc: "UDM/PA-220 metrics", status: "running" },
        { name: "cloudflared", port: null, desc: "CF Tunnel", status: "running" },
      ],
      uptime: "3d 12h",
    },
    thinkstation: {
      hostname: "ThinkStation",
      role: "Development",
      os: "Windows 11 + WSL2",
      arch: "x64",
      localIp: "192.168.2.80",
      tailscaleIp: "100.126.232.42",
      sshUser: "johnmarston",
      services: [
        { name: "OpenClaw", port: null, status: "running" },
        { name: "WSL Ubuntu", port: null, status: "running" },
      ],
      uptime: "24h",
    },
  },

  // Network Devices
  network: {
    udm: {
      name: "UDM (Core Router)",
      ip: "192.168.2.1",
      role: "DHCP, Routing, WiFi",
      snmp: "v3 (SHA/AES)",
    },
    pa220: {
      name: "PA-220 Firewall",
      ip: "192.168.2.14",
      role: "Edge Security",
      snmp: "v2c (matrixlab)",
      note: "SNMP configured",
    },
  },

  // SIEM Integration
  siem: {
    name: "Wazuh SIEM",
    owner: "Isaiah",
    status: "pending",
    agents: ["pi0", "pi1"],
    features: ["Log Collection", "FIM", "Rootkit Detection", "Vuln Scan"],
  },
};

// Connection paths for the diagram
const connections = [
  { from: "Internet", to: "Cloudflare", label: "HTTPS :443", type: "public" },
  { from: "Cloudflare", to: "CF Tunnel", label: "QUIC", type: "tunnel" },
  { from: "CF Tunnel", to: "pi1", label: "HTTP :3002", type: "tunnel" },
  { from: "CF Tunnel", to: "pi1", label: "HTTP :3000", type: "tunnel", note: "Grafana" },
  { from: "Tailscale", to: "pi0", label: "WireGuard", type: "vpn" },
  { from: "Tailscale", to: "pi1", label: "WireGuard", type: "vpn" },
  { from: "Tailscale", to: "ThinkStation", label: "WireGuard", type: "vpn" },
  { from: "pi0", to: "pi1", label: "Logs → Loki :3100", type: "internal" },
  { from: "pi0", to: "Wazuh", label: "Agent :1514", type: "siem", status: "pending" },
  { from: "pi1", to: "Wazuh", label: "Agent :1514", type: "siem", status: "pending" },
];

// Quick commands for operations
const quickCommands = {
  ssh: [
    { label: "SSH to pi0", cmd: "ssh rafaeljg@pi0", desc: "Via Tailscale" },
    { label: "SSH to pi1", cmd: "ssh johnmarston@pi1", desc: "Via Tailscale" },
    { label: "SSH to pi0 (local)", cmd: "ssh rafaeljg@192.168.2.101", desc: "Local network" },
    { label: "SSH to pi1 (local)", cmd: "ssh johnmarston@192.168.2.70", desc: "Local network" },
  ],
  services: [
    { label: "Restart GuardQuote", cmd: "ssh pi1 'cd ~/guardquote-deno && pkill -f deno; nohup deno run -A server.ts &'", desc: "API restart" },
    { label: "Restart Vector", cmd: "ssh pi0 'sudo systemctl restart vector'", desc: "Log collector" },
    { label: "Check Docker", cmd: "ssh pi1 'docker ps --format \"table {{.Names}}\\t{{.Status}}\"'", desc: "Container status" },
    { label: "Tail API logs", cmd: "ssh pi1 'tail -f /tmp/gq.log'", desc: "GuardQuote logs" },
  ],
  diagnostics: [
    { label: "Tailscale status", cmd: "tailscale status", desc: "VPN mesh status" },
    { label: "Ping pi0", cmd: "tailscale ping pi0", desc: "Via Tailscale" },
    { label: "Ping pi1", cmd: "tailscale ping pi1", desc: "Via Tailscale" },
    { label: "Check tunnel", cmd: "ssh pi1 'systemctl status cloudflared'", desc: "CF Tunnel" },
    { label: "Nettools shell", cmd: "ssh pi0 'docker exec -it nettools bash'", desc: "Bastion container" },
  ],
};

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState<"dataflow" | "topology" | "hosts" | "commands" | "siem">("dataflow");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      running: "bg-green-500/20 text-green-400 border-green-500/30",
      online: "bg-green-500/20 text-green-400 border-green-500/30",
      offline: "bg-red-500/20 text-red-400 border-red-500/30",
      error: "bg-red-500/20 text-red-400 border-red-500/30",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${colors[status] || colors.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Network className="w-7 h-7 text-accent" />
          Network Operations
        </h1>
        <p className="text-text-secondary mt-1">
          Infrastructure topology, host details, and operational commands
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {[
          { id: "dataflow", label: "Data Pipeline", icon: GitBranch },
          { id: "topology", label: "Topology", icon: Network },
          { id: "hosts", label: "Host Details", icon: Server },
          { id: "commands", label: "Quick Commands", icon: Terminal },
          { id: "siem", label: "SIEM Integration", icon: Shield },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
              activeTab === tab.id 
                ? "border-accent text-accent" 
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================================================================
          DATA FLOW TAB - Interactive SIEM Pipeline Diagram
          ====================================================================== */}
      {activeTab === "dataflow" && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-accent" />
                  Multi-Site Data Pipeline
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Interactive visualization of log collection, metrics, and SIEM integration flows
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">Click nodes for details</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Drag to pan</span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Scroll to zoom</span>
              </div>
            </div>
            <DataFlowDiagram />
          </div>

          {/* Pipeline Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-2xl font-bold text-accent">16+</div>
              <div className="text-sm text-text-secondary">Prometheus Targets</div>
              <div className="text-xs text-green-400 mt-1">All UP</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-400">~5k</div>
              <div className="text-sm text-text-secondary">Events/min</div>
              <div className="text-xs text-text-muted mt-1">Vector throughput</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-400">4</div>
              <div className="text-sm text-text-secondary">Data Sources</div>
              <div className="text-xs text-text-muted mt-1">PA-220, UDM, pi0, pi1</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-400">1</div>
              <div className="text-sm text-text-secondary">SIEM Pending</div>
              <div className="text-xs text-yellow-400 mt-1">Wazuh setup</div>
            </div>
          </div>

          {/* Data Flow Types */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              Active Data Flows
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="font-medium text-green-400 mb-2">SNMP Metrics ✓</h4>
                <ul className="text-sm space-y-1 text-text-secondary">
                  <li>• UDM → SNMPv3 (SHA/AES) → :9116 → Prometheus</li>
                  <li>• PA-220 → SNMPv2c (matrixlab) → :9116 → Prometheus</li>
                  <li>• Interface stats, uptime, system info</li>
                  <li className="text-green-400">• All targets UP</li>
                </ul>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <h4 className="font-medium text-purple-400 mb-2">Log Collection</h4>
                <ul className="text-sm space-y-1 text-text-secondary">
                  <li>• Syslog → Vector → Loki</li>
                  <li>• Journald → Vector → Loki</li>
                  <li>• Auth logs, kernel, Docker</li>
                </ul>
              </div>
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <h4 className="font-medium text-cyan-400 mb-2">SIEM Integration</h4>
                <ul className="text-sm space-y-1 text-text-secondary">
                  <li>• Vector → Wazuh (pending)</li>
                  <li>• FIM, rootkit, vulnerability scan</li>
                  <li>• Awaiting manager address</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Nettools Bastion */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent" />
              Nettools Bastion (pi0)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary mb-3">
                  Web-based terminal with network diagnostic tools. Access via browser or SSH into container.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-20">Image:</span>
                    <code className="text-xs text-green-400">nicolaka/netshoot:latest</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-20">Port:</span>
                    <code className="text-xs text-accent">7681 (ttyd)</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-20">Access:</span>
                    <a href="https://nettools.vandine.us" target="_blank" rel="noopener noreferrer" 
                       className="text-xs text-accent hover:underline flex items-center gap-1">
                      nettools.vandine.us <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-elevated rounded-lg">
                <div className="text-xs text-text-muted mb-2">Available Tools</div>
                <div className="flex flex-wrap gap-1">
                  {["nmap", "tcpdump", "mtr", "iperf3", "curl", "dig", "netstat", "ss", "ip", "traceroute", "nslookup", "whois"].map(tool => (
                    <span key={tool} className="px-2 py-0.5 bg-void rounded text-xs font-mono text-green-400">{tool}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          TOPOLOGY TAB - Visual network diagram
          ====================================================================== */}
      {activeTab === "topology" && (
        <div className="space-y-6">
          {/* INTERNET → CLOUDFLARE */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-blue-400">INTERNET</span>
              </div>
            </div>
            <div className="flex justify-center mb-4">
              <div className="flex flex-col items-center">
                <div className="w-px h-6 bg-blue-500/50" />
                <div className="px-2 py-0.5 bg-blue-500/20 rounded text-xs text-blue-300">HTTPS :443</div>
                <div className="w-px h-6 bg-blue-500/50" />
                <ArrowDown className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </div>

          {/* CLOUDFLARE EDGE */}
          <div className="bg-orange-500/5 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Cloud className="w-5 h-5 text-orange-400" />
              <span className="font-bold text-orange-400">CLOUDFLARE EDGE</span>
              <span className="text-xs text-text-muted ml-2">Zone: 2339ace...f8aa</span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { name: "Pages", desc: "guardquote.vandine.us", icon: "📄" },
                { name: "Workers", desc: "guardquote-gateway", icon: "⚡" },
                { name: "Access", desc: "Email OTP Auth", icon: "🔐" },
                { name: "Tunnel", desc: "153cc7a6-...", icon: "🚇" },
              ].map((svc, i) => (
                <div key={i} className="bg-surface/50 border border-orange-500/20 rounded-lg p-3 text-center">
                  <div className="text-lg mb-1">{svc.icon}</div>
                  <div className="font-medium text-sm">{svc.name}</div>
                  <div className="text-xs text-text-muted truncate">{svc.desc}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <div className="flex flex-col items-center">
                <ArrowDown className="w-4 h-4 text-orange-400" />
                <div className="px-2 py-0.5 bg-orange-500/20 rounded text-xs text-orange-300">QUIC Tunnel</div>
              </div>
            </div>
          </div>

          {/* HOME LAB */}
          <div className="bg-surface border-2 border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Router className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-purple-400">VANDINE HOME LAB</span>
              <span className="text-xs text-text-muted ml-2">192.168.2.0/24</span>
            </div>

            {/* Tailscale Mesh */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Tailscale Mesh (WireGuard)</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: "thinkstation", ip: "100.126.232.42", status: "online" },
                  { name: "pi0", ip: "100.114.94.18", status: "online" },
                  { name: "pi1", ip: "100.66.167.62", status: "offline" },
                  { name: "macintosh-5", ip: "100.120.179.63", status: "offline" },
                ].map((node, i) => (
                  <div key={i} className={`p-2 rounded text-center text-xs ${
                    node.status === "online" ? "bg-green-500/10 border border-green-500/30" : "bg-gray-500/10 border border-gray-500/30"
                  }`}>
                    <div className="font-mono font-medium">{node.name}</div>
                    <div className="text-text-muted font-mono">{node.ip}</div>
                    <div className={node.status === "online" ? "text-green-400" : "text-gray-400"}>● {node.status}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hosts Grid */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              {/* pi0 */}
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-green-400">pi0</span>
                  <span className="text-xs font-mono text-text-secondary">192.168.2.101</span>
                </div>
                <div className="text-xs text-text-muted mb-2">Ubuntu 25.10 • rafaeljg@pi0</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between"><span>LDAP</span><span className="text-green-400">:389</span></div>
                  <div className="flex justify-between"><span>LAM UI</span><span className="text-green-400">:8080</span></div>
                  <div className="flex justify-between"><span>rsyslog</span><span className="text-green-400">:514</span></div>
                  <div className="flex justify-between"><span>Vector</span><span className="text-green-400">bg</span></div>
                  <div className="flex justify-between"><span>nettools</span><span className="text-green-400">:7681</span></div>
                  <div className="flex justify-between"><span>nfcapd</span><span className="text-red-400">:2055 ⚠</span></div>
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="text-xs text-purple-400 font-mono">ts: 100.114.94.18</div>
                </div>
              </div>

              {/* pi1 */}
              <div className="bg-elevated border-2 border-orange-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-orange-400">pi1</span>
                  <span className="text-xs font-mono text-text-secondary">192.168.2.70</span>
                </div>
                <div className="text-xs text-text-muted mb-2">Ubuntu 25.10 • johnmarston@pi1</div>
                <div className="text-xs text-orange-400/70 mb-2">← CF Tunnel Ingress</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between"><span>GuardQuote</span><span className="text-green-400">:3002</span></div>
                  <div className="flex justify-between"><span>PostgreSQL</span><span className="text-green-400">:5432</span></div>
                  <div className="flex justify-between"><span>Grafana</span><span className="text-green-400">:3000</span></div>
                  <div className="flex justify-between"><span>Prometheus</span><span className="text-green-400">:9090</span></div>
                  <div className="flex justify-between"><span>Loki</span><span className="text-green-400">:3100</span></div>
                  <div className="flex justify-between"><span>Alertmanager</span><span className="text-green-400">:9093</span></div>
                  <div className="flex justify-between"><span>SNMP Exp</span><span className="text-green-400">:9116</span></div>
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="text-xs text-purple-400 font-mono">ts: 100.66.167.62</div>
                </div>
              </div>

              {/* ThinkStation */}
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-blue-400">ThinkStation</span>
                  <span className="text-xs font-mono text-text-secondary">192.168.2.80</span>
                </div>
                <div className="text-xs text-text-muted mb-2">Win11 + WSL2 • johnmarston</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between"><span>OpenClaw</span><span className="text-green-400">running</span></div>
                  <div className="flex justify-between"><span>WSL Ubuntu</span><span className="text-green-400">running</span></div>
                  <div className="flex justify-between"><span>Development</span><span className="text-blue-400">active</span></div>
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="text-xs text-purple-400 font-mono">ts: 100.126.232.42</div>
                </div>
              </div>
            </div>

            {/* Log Flow */}
            <div className="flex items-center justify-center gap-2 mb-4 text-xs">
              <span className="text-text-muted">pi0</span>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded">
                <span className="text-green-400">logs → Loki :3100</span>
              </div>
              <span className="text-text-muted">pi1</span>
            </div>

            {/* Network Devices */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-void border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">UDM (Router)</span>
                  <span className="text-xs font-mono text-text-secondary">192.168.2.1</span>
                </div>
                <div className="text-xs text-text-muted">DHCP • WiFi • Switching</div>
              </div>
              <div className="bg-void border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">PA-220 (Firewall)</span>
                  <span className="text-xs font-mono text-text-secondary">192.168.2.14</span>
                </div>
                <div className="text-xs text-green-400">✓ SNMP v2c configured</div>
              </div>
            </div>
          </div>

          {/* SIEM */}
          <div className="bg-yellow-500/5 border border-yellow-500/30 border-dashed rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-yellow-400">WAZUH SIEM</span>
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded">PENDING</span>
            </div>
            <div className="text-sm text-text-secondary">
              Isaiah's Wazuh Manager • Agents: pi0, pi1 (not yet installed) • TCP :1514 via Tailscale
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-orange-400" />
                <span className="font-medium text-sm">Public Access</span>
              </div>
              <p className="text-xs text-text-muted">
                Browser → Cloudflare → Tunnel → pi1
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <span className="font-medium text-sm">Protected Access</span>
              </div>
              <p className="text-xs text-text-muted">
                + CF Access (Email OTP)
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-sm">Tailscale VPN</span>
              </div>
              <p className="text-xs text-text-muted">
                Direct access via WireGuard mesh
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="font-medium text-sm">SIEM (Pending)</span>
              </div>
              <p className="text-xs text-text-muted">
                Wazuh agents → Isaiah's manager
              </p>
            </div>
          </div>

          {/* Quick IPs Reference */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-accent" />
              Quick IP Reference
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Local IPs (192.168.2.x)</div>
                <div className="space-y-1 font-mono text-sm">
                  <div className="flex justify-between"><span>pi0</span><span className="text-text-secondary">192.168.2.101</span></div>
                  <div className="flex justify-between"><span>pi1</span><span className="text-text-secondary">192.168.2.70</span></div>
                  <div className="flex justify-between"><span>ThinkStation</span><span className="text-text-secondary">192.168.2.80</span></div>
                  <div className="flex justify-between"><span>UDM</span><span className="text-text-secondary">192.168.2.1</span></div>
                  <div className="flex justify-between"><span>PA-220</span><span className="text-text-secondary">192.168.2.14</span></div>
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Tailscale IPs (100.x.x.x)</div>
                <div className="space-y-1 font-mono text-sm">
                  <div className="flex justify-between"><span>thinkstation</span><span className="text-purple-400">100.126.232.42</span></div>
                  <div className="flex justify-between"><span>pi0</span><span className="text-purple-400">100.114.94.18</span></div>
                  <div className="flex justify-between"><span>pi1</span><span className="text-text-muted">100.66.167.62 (offline)</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          HOSTS TAB - Detailed host information
          ====================================================================== */}
      {activeTab === "hosts" && (
        <div className="space-y-6">
          {Object.entries(infrastructure.hosts).map(([key, host]) => (
            <div key={key} className="bg-surface border border-border rounded-xl overflow-hidden">
              {/* Host Header */}
              <div className="p-4 bg-elevated/30 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="w-6 h-6 text-accent" />
                    <div>
                      <div className="font-bold text-lg">{host.hostname}</div>
                      <div className="text-sm text-text-muted">{host.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-text-secondary">{host.localIp}</div>
                    <div className="text-xs text-purple-400 font-mono">{host.tailscaleIp}</div>
                  </div>
                </div>
              </div>

              {/* Host Details */}
              <div className="p-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* System Info */}
                  <div>
                    <div className="text-xs text-text-muted uppercase tracking-wide mb-2">System</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">OS</span>
                        <span>{host.os}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Architecture</span>
                        <span>{host.arch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">SSH User</span>
                        <code className="text-accent">{host.sshUser}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Uptime</span>
                        <span>{host.uptime}</span>
                      </div>
                    </div>

                    {/* Quick SSH */}
                    <div className="mt-4 p-3 bg-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-2">Quick SSH</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm text-green-400">
                          ssh {host.sshUser}@{key}
                        </code>
                        <button
                          onClick={() => copyToClipboard(`ssh ${host.sshUser}@${key}`, `ssh-${key}`)}
                          className="p-1.5 hover:bg-void rounded"
                        >
                          {copied === `ssh-${key}` ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-text-muted" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Services</div>
                    <div className="space-y-2">
                      {host.services.map((svc, i) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 bg-elevated rounded">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-text-muted" />
                            <span>{svc.name}</span>
                            {svc.port && (
                              <code className="text-xs text-accent">:{svc.port}</code>
                            )}
                          </div>
                          <StatusBadge status={svc.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Network Devices */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Router className="w-4 h-4 text-accent" />
              Network Devices
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-elevated rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{infrastructure.network.udm.name}</span>
                  <code className="text-sm text-text-secondary">{infrastructure.network.udm.ip}</code>
                </div>
                <p className="text-sm text-text-muted">{infrastructure.network.udm.role}</p>
              </div>
              <div className="p-4 bg-elevated rounded-lg border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{infrastructure.network.pa220.name}</span>
                  <code className="text-sm text-text-secondary">{infrastructure.network.pa220.ip}</code>
                </div>
                <p className="text-sm text-text-muted">{infrastructure.network.pa220.role}</p>
                <div className="flex items-center gap-1 mt-2 text-green-400 text-xs">
                  <Check className="w-3 h-3" />
                  SNMP v2c configured
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          COMMANDS TAB - Operational commands
          ====================================================================== */}
      {activeTab === "commands" && (
        <div className="space-y-6">
          {Object.entries(quickCommands).map(([category, commands]) => (
            <div key={category} className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4 capitalize flex items-center gap-2">
                <Terminal className="w-4 h-4 text-accent" />
                {category === "ssh" ? "SSH Access" : category === "services" ? "Service Management" : "Diagnostics"}
              </h3>
              <div className="space-y-3">
                {commands.map((cmd, i) => (
                  <div key={i} className="p-3 bg-elevated rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{cmd.label}</span>
                      <span className="text-xs text-text-muted">{cmd.desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-green-400 bg-void px-3 py-2 rounded overflow-x-auto">
                        {cmd.cmd}
                      </code>
                      <button
                        onClick={() => copyToClipboard(cmd.cmd, `cmd-${category}-${i}`)}
                        className="p-2 hover:bg-void rounded flex-shrink-0"
                      >
                        {copied === `cmd-${category}-${i}` ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-text-muted" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Common URLs */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              Service URLs
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { name: "GuardQuote", url: "https://guardquote.vandine.us", internal: "http://192.168.2.70:3002" },
                { name: "Grafana", url: "https://grafana.vandine.us", internal: "http://192.168.2.70:3000" },
                { name: "Prometheus", url: "https://prometheus.vandine.us", internal: "http://192.168.2.70:9090" },
                { name: "LDAP Admin", url: "https://ldap.vandine.us", internal: "http://192.168.2.101:8080" },
                { name: "Nettools", url: "https://nettools.vandine.us", internal: "http://192.168.2.101:7681" },
              ].map((svc, i) => (
                <div key={i} className="p-3 bg-elevated rounded-lg">
                  <div className="font-medium text-sm mb-1">{svc.name}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <a href={svc.url} target="_blank" rel="noopener noreferrer" 
                       className="text-accent hover:underline flex items-center gap-1">
                      {svc.url.replace("https://", "")}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-text-muted">|</span>
                    <code className="text-text-secondary">{svc.internal}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          SIEM TAB - Wazuh integration status
          ====================================================================== */}
      {activeTab === "siem" && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-yellow-400">Wazuh SIEM Integration</h3>
                <p className="text-text-secondary mt-1">
                  Waiting for Isaiah to set up his Wazuh manager. Once ready, we'll install agents on pi0 and pi1.
                </p>
                <div className="mt-3">
                  <StatusBadge status="pending" />
                </div>
              </div>
            </div>
          </div>

          {/* What We Need */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-accent" />
              What We Need from Isaiah
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-elevated rounded-lg">
                <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                <div>
                  <div className="font-medium">Wazuh Manager Address</div>
                  <p className="text-sm text-text-muted">Tailscale hostname (e.g., isaiah-wazuh.ts.net) or public IP</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-elevated rounded-lg">
                <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                <div>
                  <div className="font-medium">Agent Registration Keys</div>
                  <p className="text-sm text-text-muted">One key for pi0, one for pi1. Generated with manage_agents on his manager.</p>
                </div>
              </div>
            </div>
          </div>

          {/* What Gets Monitored */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-accent" />
              What Wazuh Will Monitor
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs text-text-muted uppercase tracking-wide">Log Sources</div>
                {[
                  { name: "/var/log/syslog", desc: "System messages" },
                  { name: "/var/log/auth.log", desc: "Authentication events" },
                  { name: "/var/log/kern.log", desc: "Kernel messages" },
                  { name: "/var/log/docker.log", desc: "Container logs" },
                  { name: "journald", desc: "Systemd journal" },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-elevated rounded">
                    <code className="text-green-400">{log.name}</code>
                    <span className="text-text-muted text-xs">{log.desc}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-xs text-text-muted uppercase tracking-wide">Security Features</div>
                {[
                  { name: "File Integrity", desc: "/etc, /usr/bin, GuardQuote app" },
                  { name: "Rootkit Detection", desc: "Known rootkit signatures" },
                  { name: "Vulnerability Scan", desc: "Ubuntu CVE database" },
                  { name: "System Inventory", desc: "Packages, ports, processes" },
                ].map((feat, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-elevated rounded">
                    <span className="font-medium">{feat.name}</span>
                    <span className="text-text-muted text-xs">{feat.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Backup: Vector */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-accent" />
              Backup Log Collection (Vector)
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Vector is running on pi0 as a backup log collector. Logs are archived locally and sent to Loki for Grafana visualization.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-elevated rounded-lg">
                <div className="font-medium mb-1">Local Archive</div>
                <code className="text-xs text-text-secondary">/var/log/vector/archive/YYYY-MM-DD.json.zst</code>
              </div>
              <div className="p-3 bg-elevated rounded-lg">
                <div className="font-medium mb-1">Loki Endpoint</div>
                <code className="text-xs text-text-secondary">http://192.168.2.70:3100</code>
              </div>
            </div>
          </div>

          {/* Install Instructions */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent" />
              Agent Installation (When Ready)
            </h3>
            <div className="p-4 bg-void rounded-lg">
              <pre className="text-sm text-green-400 overflow-x-auto">
{`# Set environment variables (Isaiah provides these)
export WAZUH_MANAGER="isaiah-wazuh.ts.net"
export WAZUH_AGENT_KEY="MDAxIHBpMCAx..."

# Run install script
cd ~/.openclaw/workspace/scripts
sudo -E ./wazuh-agent-install.sh`}
              </pre>
            </div>
            <p className="text-xs text-text-muted mt-3">
              Script location: <code>~/.openclaw/workspace/scripts/wazuh-agent-install.sh</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
