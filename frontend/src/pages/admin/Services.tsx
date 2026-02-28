import { useState, useEffect } from "react";
import { getAuthHeaders } from "../../context/AuthContext";
import { Server, Activity, Cpu, HardDrive, Thermometer, Clock, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";

interface Service {
  name: string;
  displayName: string;
  description: string;
  status: string;
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
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [svcRes, sysRes] = await Promise.all([
        fetch("/api/admin/services", { headers: getAuthHeaders() }),
        fetch("/api/admin/services/system", { headers: getAuthHeaders() }),
      ]);

      if (svcRes.ok) setServices(await svcRes.json());
      if (sysRes.ok) setSystem(await sysRes.json());
    } catch (e: any) {
      setError(e.message || "Failed to fetch service data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const running = services.filter(s => s.status === "running").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="w-7 h-7 text-blue-400" />
            Services
          </h1>
          <p className="text-zinc-400 mt-1">
            {running}/{services.length} services running
            {system && <> &middot; {system.hostname}</>}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* System Metrics */}
      {system && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Uptime
            </div>
            <p className="text-xl font-bold text-white">{system.uptime}</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Cpu className="w-4 h-4" />
              Load Avg
            </div>
            <p className="text-xl font-bold text-white">{system.loadAvg}</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <HardDrive className="w-4 h-4" />
              Memory
            </div>
            <p className="text-xl font-bold text-white">{system.memoryUsed}</p>
            <p className="text-zinc-500 text-xs">of {system.memoryTotal}</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Thermometer className="w-4 h-4" />
              CPU Temp
            </div>
            <p className="text-xl font-bold text-white">{system.cpuTemp}</p>
            <p className="text-zinc-500 text-xs">Disk: {system.diskUsed}/{system.diskTotal}</p>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-3">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="flex items-center justify-between p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full ${
                svc.status === "running" ? "bg-emerald-400" :
                svc.status === "error" ? "bg-red-400" :
                "bg-amber-400"
              }`} />
              <div>
                <h3 className="text-white font-medium">{svc.displayName}</h3>
                <p className="text-zinc-500 text-sm">{svc.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              {svc.port && (
                <span className="text-zinc-500 text-xs font-mono">:{svc.port}</span>
              )}
              {svc.uptime && (
                <span className="text-zinc-400 text-xs">{svc.uptime}</span>
              )}
              {svc.memory && (
                <span className="text-zinc-400 text-xs">{svc.memory}</span>
              )}
              <span className={`px-2 py-0.5 text-xs rounded ${
                svc.status === "running"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}>
                {svc.status}
              </span>
            </div>
          </div>
        ))}
        {!loading && services.length === 0 && (
          <p className="text-zinc-500 text-center py-8">No service data available</p>
        )}
      </div>

      {/* Grafana Link */}
      <a
        href="https://grafana.vandine.us"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg hover:border-zinc-600 transition"
      >
        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-medium">Grafana Monitoring</h3>
          <p className="text-zinc-500 text-sm">Full dashboards, Prometheus metrics, and Loki logs</p>
        </div>
        <ExternalLink className="w-5 h-5 text-zinc-500" />
      </a>
    </div>
  );
}
