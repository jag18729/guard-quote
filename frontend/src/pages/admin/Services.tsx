import { useState } from "react";
import { Server, Cpu, HardDrive, Activity, Wifi, ExternalLink, Terminal } from "lucide-react";

interface Service {
  name: string;
  port?: number;
  desc: string;
}

interface Host {
  name: string;
  ip: string;
  tailscale?: string;
  dmz?: string;
  os: string;
  arch: string;
  specs: string;
  services: Service[];
}

const HOSTS: Host[] = [
  {
    name: "rv2",
    ip: "192.168.2.90",
    dmz: "192.168.25.2",
    os: "Ubuntu 24.04",
    arch: "RISC-V 64-bit",
    specs: "Ky X1 8-core, 8GB RAM, 500GB NVMe",
    services: [
      { name: "Suricata IDS", port: undefined, desc: "Network intrusion detection (48,687 rules)" },
      { name: "LLM API", port: 8090, desc: "Qwen2 1.5B alert triage" },
      { name: "rsyslog", port: 514, desc: "Log forwarding to pi0" },
      { name: "node_exporter", port: 9100, desc: "Prometheus metrics" },
      { name: "chrony", desc: "NTP client (syncs from pi1)" },
    ],
  },
  {
    name: "pi2",
    ip: "192.168.22.10",
    tailscale: "100.111.113.35",
    os: "Debian 12",
    arch: "ARM64",
    specs: "RPi 4, 8GB RAM, K3s node",
    services: [
      { name: "K3s", port: 6443, desc: "Kubernetes API server" },
      { name: "GuardQuote Frontend", port: 30522, desc: "React + nginx" },
      { name: "GuardQuote Backend", port: 30520, desc: "Bun + Hono API" },
      { name: "GuardQuote ML", port: 30521, desc: "FastAPI + sklearn" },
      { name: "Wazuh Manager", port: 1514, desc: "SIEM manager (Docker)" },
      { name: "Vector", port: 8686, desc: "Log shipper to Loki" },
      { name: "node_exporter", port: 9100, desc: "Prometheus metrics" },
    ],
  },
  {
    name: "pi0",
    ip: "192.168.2.101",
    dmz: "192.168.21.10",
    os: "Debian 12",
    arch: "ARM64",
    specs: "RPi 4, 4GB RAM, dual-homed",
    services: [
      { name: "OpenLDAP", port: 389, desc: "Identity provider" },
      { name: "LAM", port: 8080, desc: "LDAP Account Manager UI" },
      { name: "AdGuard Home", port: 53, desc: "DNS server + filtering" },
      { name: "Vector", port: 8686, desc: "Log aggregator/shipper" },
      { name: "rsyslog", port: 514, desc: "Syslog receiver" },
      { name: "SNMP Exporter", port: 9116, desc: "Network device metrics" },
      { name: "cloudflared", desc: "Cloudflare tunnel (revealtome)" },
      { name: "Nettools/ttyd", port: 7681, desc: "Web terminal (bastion)" },
      { name: "node_exporter", port: 9100, desc: "Prometheus metrics" },
    ],
  },
  {
    name: "pi1",
    ip: "192.168.20.10",
    os: "Debian 12",
    arch: "ARM64",
    specs: "RPi 4, 8GB RAM, monitoring hub",
    services: [
      { name: "Grafana", port: 3000, desc: "Dashboards + alerting" },
      { name: "Prometheus", port: 9090, desc: "Metrics database (34 targets)" },
      { name: "Loki", port: 3100, desc: "Log aggregation" },
      { name: "Alertmanager", port: 9093, desc: "Alert routing" },
      { name: "PostgreSQL", port: 5432, desc: "GuardQuote database" },
      { name: "cloudflared", desc: "Cloudflare tunnel (vandine)" },
      { name: "NTP Server", port: 123, desc: "Fleet time source" },
      { name: "node_exporter", port: 9100, desc: "Prometheus metrics" },
    ],
  },
  {
    name: "ThinkStation",
    ip: "192.168.2.80",
    tailscale: "100.73.127.58",
    os: "Windows 11 + WSL2",
    arch: "x64",
    specs: "Xeon E5-2680v4, 64GB RAM, RTX 3060",
    services: [
      { name: "OpenClaw Gateway", port: 8090, desc: "AI assistant (this)" },
      { name: "Wazuh Agent", desc: "SIEM agent → pi2" },
      { name: "Tailscale", desc: "Mesh VPN" },
      { name: "Docker Desktop", desc: "Container runtime" },
    ],
  },
];

const QUICK_LINKS = [
  { name: "Grafana", url: "https://grafana.vandine.us", desc: "Dashboards" },
  { name: "Prometheus", url: "http://192.168.20.10:9090", desc: "Metrics" },
  { name: "GuardQuote", url: "https://guardquote.vandine.us", desc: "This app" },
  { name: "Bastion", url: "https://bastion.vandine.us", desc: "CLI access" },
];

export default function Services() {
  const [selectedHost, setSelectedHost] = useState<string | null>(null);

  const totalServices = HOSTS.reduce((acc, h) => acc + h.services.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="w-7 h-7 text-blue-400" />
            Infrastructure Services
          </h1>
          <p className="text-zinc-400 mt-1">
            {HOSTS.length} hosts • {totalServices} services
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-white font-medium text-sm">{link.name}</p>
              <p className="text-zinc-500 text-xs">{link.desc}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center">
          <Cpu className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{HOSTS.length}</p>
          <p className="text-zinc-400 text-sm">Hosts</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center">
          <Activity className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{totalServices}</p>
          <p className="text-zinc-400 text-sm">Services</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center">
          <HardDrive className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">34</p>
          <p className="text-zinc-400 text-sm">Prometheus Targets</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center">
          <Wifi className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">4</p>
          <p className="text-zinc-400 text-sm">DMZ Zones</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center">
          <Terminal className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">4</p>
          <p className="text-zinc-400 text-sm">Wazuh Agents</p>
        </div>
      </div>

      {/* Hosts */}
      <div className="space-y-4">
        {HOSTS.map((host) => (
          <div
            key={host.name}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden"
          >
            {/* Host Header */}
            <button
              onClick={() => setSelectedHost(selectedHost === host.name ? null : host.name)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{host.name}</h3>
                    <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                      online
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm">
                    {host.ip}
                    {host.tailscale && ` • TS: ${host.tailscale}`}
                    {host.dmz && ` • DMZ: ${host.dmz}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 text-sm">{host.os}</p>
                <p className="text-zinc-500 text-xs">{host.arch} • {host.specs}</p>
              </div>
            </button>

            {/* Services (expanded) */}
            {selectedHost === host.name && (
              <div className="border-t border-zinc-700 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {host.services.map((svc) => (
                    <div
                      key={svc.name}
                      className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm">{svc.name}</span>
                        {svc.port && (
                          <span className="text-zinc-500 text-xs font-mono">:{svc.port}</span>
                        )}
                      </div>
                      <p className="text-zinc-500 text-xs">{svc.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-zinc-600 text-xs mt-3 text-center">
                  SSH agent not configured — use bastion.vandine.us for remote access
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 text-center">
        <p className="text-zinc-500 text-sm">
          This page shows static infrastructure data. For live metrics, use{" "}
          <a href="https://grafana.vandine.us" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Grafana
          </a>{" "}
          or the{" "}
          <a href="https://bastion.vandine.us" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Bastion CLI
          </a>.
        </p>
      </div>
    </div>
  );
}
