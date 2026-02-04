import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "../../context/AuthContext";
import { Server, RefreshCw, Play, Square, RotateCcw, ScrollText, Cpu, HardDrive, Thermometer, Clock } from "lucide-react";

interface Service {
  name: string;
  displayName: string;
  description: string;
  status: "running" | "stopped" | "error" | "planned";
  port?: number;
  uptime?: string;
  memory?: string;
}

interface SystemInfo {
  hostname: string;
  uptime: string;
  loadAvg: string;
  memoryUsed: string;
  memoryTotal: string;
  diskUsed: string;
  diskTotal: string;
  cpuTemp: string;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ service: string; content: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    const [svc, sys] = await Promise.all([
      fetch("/api/admin/services", { headers: getAuthHeaders() }).then(r => r.json()),
      fetch("/api/admin/services/system", { headers: getAuthHeaders() }).then(r => r.json()),
    ]);
    setServices(svc);
    setSystem(sys);
    setLoading(false);
  }, []);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  const handleAction = async (name: string, action: string) => {
    setActionLoading(`${name}-${action}`);
    await fetch(`/api/admin/services/${name}/${action}`, { method: "POST", headers: getAuthHeaders() });
    await fetchData();
    setActionLoading(null);
  };
  
  const viewLogs = async (name: string) => {
    const res = await fetch(`/api/admin/services/${name}/logs?lines=100`, { headers: getAuthHeaders() });
    const data = await res.json();
    setLogs({ service: name, content: data.logs || "No logs available" });
  };
  
  const statusStyles: Record<string, string> = {
    running: "bg-success text-success",
    stopped: "bg-text-muted text-text-muted",
    error: "bg-critical text-critical",
    planned: "bg-blue-400 text-blue-400",
  };
  
  if (loading) return <div className="p-8 text-text-secondary">Loading services...</div>;
  
  const svc = selected ? services.find(s => s.name === selected) : null;
  
  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Services</h1>
          <p className="text-text-secondary text-sm">Monitor and control Pi1 infrastructure</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 border border-border hover:bg-elevated rounded transition text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      
      {/* System overview */}
      {system && (
        <div className="mb-6 p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-sm text-accent">{system.hostname}</span>
            <span className="text-xs text-text-muted">up {system.uptime}</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Cpu, label: "Load", value: system.loadAvg },
              { icon: Server, label: "Memory", value: `${system.memoryUsed} / ${system.memoryTotal}` },
              { icon: HardDrive, label: "Disk", value: `${system.diskUsed} / ${system.diskTotal}` },
              { icon: Thermometer, label: "Temp", value: system.cpuTemp },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <stat.icon className="w-4 h-4 text-text-muted" />
                <div>
                  <div className="text-xs text-text-muted">{stat.label}</div>
                  <div className="text-sm font-mono">{stat.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Service summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(["running", "stopped", "error", "planned"] as const).map(status => {
          const count = services.filter(s => s.status === status).length;
          return (
            <div key={status} className="p-3 bg-surface border border-border rounded-lg text-center">
              <div className={`text-2xl font-bold ${statusStyles[status].split(" ")[1]}`}>{count}</div>
              <div className="text-xs text-text-muted uppercase">{status}</div>
            </div>
          );
        })}
      </div>
      
      {/* Services grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
        {services.map(svc => (
          <button
            key={svc.name}
            onClick={() => setSelected(svc.name === selected ? null : svc.name)}
            className={`p-3 border rounded-lg text-left transition ${selected === svc.name ? "border-accent bg-accent/10" : "border-border hover:border-border-accent bg-surface"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full status-pulse ${statusStyles[svc.status].split(" ")[0]}`} />
              <span className="text-xs font-mono text-text-muted">{svc.port ? `:${svc.port}` : ""}</span>
            </div>
            <div className="text-sm font-medium truncate">{svc.displayName}</div>
          </button>
        ))}
      </div>
      
      {/* Selected service panel */}
      {svc && (
        <div className="p-5 bg-surface border border-accent/50 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full status-pulse ${statusStyles[svc.status].split(" ")[0]}`} />
                <h3 className="text-lg font-semibold">{svc.displayName}</h3>
                {svc.status === "planned" && <span className="px-2 py-0.5 text-[10px] bg-blue-400/20 text-blue-400 rounded">Coming Soon</span>}
              </div>
              <p className="text-sm text-text-secondary mt-1">{svc.description}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary">&times;</button>
          </div>
          
          {svc.status !== "planned" && (
            <>
              <div className="flex gap-4 mb-4 text-sm text-text-secondary">
                {svc.port && <span className="flex items-center gap-1"><Server className="w-4 h-4" /> Port {svc.port}</span>}
                {svc.uptime && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Up {svc.uptime}</span>}
                {svc.memory && <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> {svc.memory}</span>}
              </div>
              
              <div className="flex gap-2">
                {svc.status === "running" ? (
                  <>
                    <button onClick={() => handleAction(svc.name, "restart")} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/20 text-warning hover:bg-warning/30 rounded text-sm transition">
                      <RotateCcw className="w-4 h-4" /> {actionLoading === `${svc.name}-restart` ? "..." : "Restart"}
                    </button>
                    <button onClick={() => handleAction(svc.name, "stop")} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-critical/20 text-critical hover:bg-critical/30 rounded text-sm transition">
                      <Square className="w-4 h-4" /> {actionLoading === `${svc.name}-stop` ? "..." : "Stop"}
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleAction(svc.name, "start")} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/20 text-success hover:bg-success/30 rounded text-sm transition">
                    <Play className="w-4 h-4" /> {actionLoading === `${svc.name}-start` ? "..." : "Start"}
                  </button>
                )}
                <button onClick={() => viewLogs(svc.name)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-elevated rounded text-sm transition">
                  <ScrollText className="w-4 h-4" /> Logs
                </button>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Logs modal */}
      {logs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={() => setLogs(null)}>
          <div className="w-full max-w-4xl max-h-[80vh] bg-surface border border-border rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-semibold">Logs: {logs.service}</h3>
              <button onClick={() => setLogs(null)} className="text-text-muted hover:text-text-primary">&times;</button>
            </div>
            <pre className="p-4 text-xs font-mono text-text-secondary overflow-auto max-h-[60vh] bg-elevated/50">{logs.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
