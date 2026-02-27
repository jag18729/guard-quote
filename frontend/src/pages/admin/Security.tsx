import { useState } from "react";
import { Shield, AlertTriangle, Server, Activity, ExternalLink, Copy, Check, Terminal } from "lucide-react";

interface WazuhAgent {
  id: string;
  name: string;
  ip: string;
  status: "active" | "disconnected";
  os: string;
}

interface LogQuery {
  name: string;
  description: string;
  query: string;
}

const WAZUH_AGENTS: WazuhAgent[] = [
  { id: "001", name: "pi1", ip: "192.168.20.10", status: "active", os: "Debian 12" },
  { id: "002", name: "pi0", ip: "192.168.21.10", status: "active", os: "Debian 12" },
  { id: "003", name: "ThinkStation", ip: "192.168.2.80", status: "active", os: "Windows 11" },
  { id: "004", name: "XPS", ip: "100.73.127.58", status: "active", os: "Windows 11" },
];

const LOG_QUERIES: LogQuery[] = [
  {
    name: "All Wazuh Alerts",
    description: "Every alert from all agents",
    query: '{job="wazuh-alerts"}',
  },
  {
    name: "High Severity",
    description: "Critical and high severity alerts only",
    query: '{job="wazuh-alerts", severity=~"high|critical"}',
  },
  {
    name: "Authentication Events",
    description: "Login attempts, failures, sudo usage",
    query: '{job="wazuh-alerts"} |= "authentication"',
  },
  {
    name: "File Integrity (Syscheck)",
    description: "File changes, new files, deleted files",
    query: '{job="wazuh-alerts"} |= "syscheck"',
  },
  {
    name: "Suricata Alerts",
    description: "IDS alerts from rv2 Edge sensor",
    query: '{job="rv2-syslog"} |= "alert"',
  },
  {
    name: "Specific Host",
    description: "Filter by agent name",
    query: '{job="wazuh-alerts", host="pi1"}',
  },
];

const QUICK_COMMANDS = [
  { name: "Wazuh Status", cmd: "wazuh", desc: "Show agents + recent alerts" },
  { name: "Recent Alerts", cmd: "loki", desc: "Last 20 Wazuh alerts (default query)" },
  { name: "High Severity", cmd: "alerts", desc: "High/critical severity only" },
  { name: "Suricata Status", cmd: "suricata", desc: "IDS status from rv2" },
  { name: "Help", cmd: "help", desc: "All available commands" },
];

export default function Security() {
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: "query" | "cmd") => {
    navigator.clipboard.writeText(text);
    if (type === "query") {
      setCopiedQuery(text);
      setTimeout(() => setCopiedQuery(null), 2000);
    } else {
      setCopiedCmd(text);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
  };

  const activeAgents = WAZUH_AGENTS.filter(a => a.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-400" />
            Security Operations
          </h1>
          <p className="text-zinc-400 mt-1">Wazuh SIEM • Suricata IDS • Log Analysis</p>
        </div>
        <a
          href="https://grafana.vandine.us/explore"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open Grafana Explore
        </a>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeAgents}</p>
              <p className="text-zinc-400 text-sm">Wazuh Agents</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">48,687</p>
              <p className="text-zinc-400 text-sm">Suricata Rules</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">rv2</p>
              <p className="text-zinc-400 text-sm">Edge IDS Sensor</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">Loki</p>
              <p className="text-zinc-400 text-sm">Log Backend</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wazuh Agents */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            Wazuh Agents
          </h2>
          <div className="space-y-3">
            {WAZUH_AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      agent.status === "active" ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <div>
                    <p className="text-white font-medium">{agent.name}</p>
                    <p className="text-zinc-500 text-sm">{agent.ip}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-zinc-400 text-sm">ID: {agent.id}</p>
                  <p className="text-zinc-500 text-xs">{agent.os}</p>
                </div>
              </div>
            ))}
            <div className="p-3 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-700 text-center">
              <p className="text-zinc-500 text-sm">
                rv2 (Edge IDS) — No agent (RISC-V), covered by Suricata
              </p>
            </div>
          </div>
        </div>

        {/* Quick Commands */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            Bastion Commands
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Run these in{" "}
            <a
              href="https://bastion.vandine.us"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              bastion.vandine.us
            </a>
          </p>
          <div className="space-y-3">
            {QUICK_COMMANDS.map((cmd) => (
              <div
                key={cmd.name}
                className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white font-medium text-sm">{cmd.name}</p>
                  <button
                    onClick={() => copyToClipboard(cmd.cmd, "cmd")}
                    className="p-1 hover:bg-zinc-700 rounded transition-colors"
                  >
                    {copiedCmd === cmd.cmd ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </div>
                <code className="text-emerald-400 text-xs font-mono block bg-black/30 p-2 rounded">
                  {cmd.cmd}
                </code>
                <p className="text-zinc-500 text-xs mt-1">{cmd.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LogQL Queries */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          LogQL Queries for Grafana
        </h2>
        <p className="text-zinc-400 text-sm mb-4">
          Copy these queries and paste into{" "}
          <a
            href="https://grafana.vandine.us/explore"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:underline"
          >
            Grafana Explore
          </a>{" "}
          (select Loki datasource)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOG_QUERIES.map((q) => (
            <div
              key={q.name}
              className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/50 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium">{q.name}</p>
                <button
                  onClick={() => copyToClipboard(q.query, "query")}
                  className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                  title="Copy query"
                >
                  {copiedQuery === q.query ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
              <code className="text-purple-400 text-sm font-mono block bg-black/30 p-2 rounded mb-2 break-all">
                {q.query}
              </code>
              <p className="text-zinc-500 text-sm">{q.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Info */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Security Architecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h3 className="text-emerald-400 font-medium mb-2">Wazuh (HIDS)</h3>
            <ul className="text-zinc-400 space-y-1">
              <li>• Manager: pi2 Docker</li>
              <li>• Agents: pi0, pi1, ThinkStation, XPS</li>
              <li>• File integrity monitoring</li>
              <li>• Rootkit detection</li>
              <li>• Log analysis</li>
            </ul>
          </div>
          <div>
            <h3 className="text-blue-400 font-medium mb-2">Suricata (NIDS)</h3>
            <ul className="text-zinc-400 space-y-1">
              <li>• Sensor: rv2 (Edge IDS)</li>
              <li>• 48,687 ET rules</li>
              <li>• Monitors dmz-security</li>
              <li>• EVE JSON → Loki</li>
              <li>• LLM triage (experimental)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-purple-400 font-medium mb-2">Log Pipeline</h3>
            <ul className="text-zinc-400 space-y-1">
              <li>• Vector on pi0, pi2, rv2</li>
              <li>• Loki on pi1</li>
              <li>• Grafana dashboards</li>
              <li>• Job labels: wazuh-alerts, rv2-syslog</li>
              <li>• Severity labels extracted</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
