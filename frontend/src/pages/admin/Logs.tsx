import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "../../context/AuthContext";
import { ScrollText, RefreshCw, Filter, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface LogEntry {
  timestamp: string;
  level: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  message: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "info" | "error">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs?limit=100", { headers: getAuthHeaders() });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchLogs();
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchLogs, autoRefresh]);
  
  const filtered = filter === "all" ? logs : logs.filter(l => l.level === filter);
  
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  
  const statusColor = (s: number) => {
    if (s < 300) return "text-success";
    if (s < 400) return "text-blue-400";
    if (s < 500) return "text-warning";
    return "text-critical";
  };
  
  const methodColor = (m: string) => {
    const colors: Record<string, string> = {
      GET: "text-blue-400",
      POST: "text-success",
      PUT: "text-warning",
      PATCH: "text-purple-400",
      DELETE: "text-critical",
    };
    return colors[m] || "text-text-secondary";
  };
  
  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Request Logs</h1>
          <p className="text-text-secondary text-sm">Real-time API request monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-border bg-surface"
            />
            Auto-refresh
          </label>
          <button onClick={fetchLogs} className="flex items-center gap-2 px-3 py-1.5 border border-border hover:bg-elevated rounded transition text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-text-muted" />
        {(["all", "info", "error"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs font-medium rounded transition ${filter === f ? "bg-accent text-void" : "bg-surface border border-border text-text-secondary hover:text-text-primary"}`}
          >
            {f === "all" ? "All" : f === "info" ? "Info" : "Errors"}
          </button>
        ))}
        <span className="ml-auto text-xs text-text-muted font-mono">{filtered.length} entries</span>
      </div>
      
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: ScrollText, label: "Total", value: logs.length, color: "text-accent" },
          { icon: CheckCircle2, label: "Success", value: logs.filter(l => l.status < 400).length, color: "text-success" },
          { icon: AlertCircle, label: "Errors", value: logs.filter(l => l.status >= 400).length, color: "text-critical" },
          { icon: Clock, label: "Avg Time", value: logs.length ? `${Math.round(logs.reduce((a, l) => a + l.duration, 0) / logs.length)}ms` : "0ms", color: "text-blue-400" },
        ].map((stat, i) => (
          <div key={i} className="p-3 bg-surface border border-border rounded-lg flex items-center gap-3">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[10px] text-text-muted uppercase">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Log entries */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No logs yet. Make some API requests!</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {filtered.map((log, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2 hover:bg-elevated/30 transition text-sm font-mono">
                <span className="text-text-muted text-xs w-20">{formatTime(log.timestamp)}</span>
                <span className={`w-12 text-xs font-semibold ${methodColor(log.method)}`}>{log.method}</span>
                <span className="flex-1 truncate text-text-secondary">{log.path}</span>
                <span className={`w-10 text-right text-xs font-semibold ${statusColor(log.status)}`}>{log.status}</span>
                <span className="w-16 text-right text-xs text-text-muted">{log.duration}ms</span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${log.level === "error" ? "bg-critical/20" : "bg-success/20"}`}>
                  {log.level === "error" ? <AlertCircle className="w-3 h-3 text-critical" /> : <CheckCircle2 className="w-3 h-3 text-success" />}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
