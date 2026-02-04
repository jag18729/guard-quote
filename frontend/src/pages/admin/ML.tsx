import { useState, useEffect } from "react";
import { getAuthHeaders } from "../../context/AuthContext";
import { Brain, Database, RefreshCw, Download, RotateCcw, Trash2, TrendingUp, Activity, Zap, AlertTriangle } from "lucide-react";

interface ModelStatus {
  currentModel: { version: string; type: string; lastUpdated: string; status: string };
  trainingData: { totalRecords: number; eventTypes: number; locations: number };
  performance: { accuracy: number; avgConfidence: number; predictionsToday: number; avgResponseTime: string };
  versions: Array<{ version: string; type: string; date: string; active: boolean; accuracy: number }>;
}

interface TrainingRecord {
  id: number;
  event_type_code: string;
  state: string;
  risk_zone: string;
  num_guards: number;
  crowd_size: number;
  final_price: string;
  risk_score: string;
  was_accepted: boolean;
  created_at: string;
}

export default function ML() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [trainingData, setTrainingData] = useState<TrainingRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "data" | "versions">("overview");
  
  const fetchData = async () => {
    const [s, d, st] = await Promise.all([
      fetch("/api/admin/ml/status", { headers: getAuthHeaders() }).then(r => r.json()),
      fetch("/api/admin/ml/training-data?limit=50", { headers: getAuthHeaders() }).then(r => r.json()),
      fetch("/api/admin/ml/training-stats", { headers: getAuthHeaders() }).then(r => r.json()),
    ]);
    setStatus(s);
    setTrainingData(d.data || []);
    setStats(st);
    setLoading(false);
  };
  
  useEffect(() => { fetchData(); }, []);
  
  const handleRollback = async (version: string) => {
    if (!confirm(`Roll back to model ${version}? This will change pricing calculations.`)) return;
    setActionLoading("rollback");
    await fetch("/api/admin/ml/rollback", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ version }),
    });
    await fetchData();
    setActionLoading(null);
  };
  
  const handleRetrain = async () => {
    if (!confirm("Initiate model retraining? This may take a few minutes.")) return;
    setActionLoading("retrain");
    const res = await fetch("/api/admin/ml/retrain", { method: "POST", headers: getAuthHeaders() });
    const data = await res.json();
    alert(data.message);
    setActionLoading(null);
  };
  
  const handleExport = async () => {
    setActionLoading("export");
    const res = await fetch("/api/admin/ml/export", { headers: getAuthHeaders() });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ml-training-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    setActionLoading(null);
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this training record?")) return;
    await fetch(`/api/admin/ml/training-data/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    fetchData();
  };
  
  if (loading) return <div className="p-8 text-text-secondary">Loading ML dashboard...</div>;
  
  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Brain className="w-6 h-6 text-accent" /> ML Engine
          </h1>
          <p className="text-text-secondary text-sm">Manage prediction models and training data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 border border-border hover:bg-elevated rounded text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleExport} disabled={!!actionLoading} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-sm">
            <Download className="w-4 h-4" /> {actionLoading === "export" ? "..." : "Export Data"}
          </button>
          <button onClick={handleRetrain} disabled={!!actionLoading} className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 text-accent hover:bg-accent/30 rounded text-sm">
            <Zap className="w-4 h-4" /> {actionLoading === "retrain" ? "..." : "Retrain Model"}
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(["overview", "data", "versions"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${tab === t ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}
          >
            {t === "data" ? "Training Data" : t === "versions" ? "Model Versions" : "Overview"}
          </button>
        ))}
      </div>
      
      {/* Overview Tab */}
      {tab === "overview" && status && (
        <>
          {/* Model Status */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-accent" />
                <span className="text-xs text-text-muted">Model Version</span>
              </div>
              <div className="text-xl font-bold">{status.currentModel.version}</div>
              <div className="text-xs text-text-muted">{status.currentModel.type}</div>
            </div>
            <div className="p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs text-text-muted">Accuracy</span>
              </div>
              <div className="text-xl font-bold text-success">{status.performance.accuracy}%</div>
              <div className="text-xs text-text-muted">Avg confidence: {status.performance.avgConfidence}%</div>
            </div>
            <div className="p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-text-muted">Training Records</span>
              </div>
              <div className="text-xl font-bold">{status.trainingData.totalRecords.toLocaleString()}</div>
              <div className="text-xs text-text-muted">{status.trainingData.eventTypes} event types</div>
            </div>
            <div className="p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-text-muted">Today's Predictions</span>
              </div>
              <div className="text-xl font-bold">{status.performance.predictionsToday}</div>
              <div className="text-xs text-text-muted">Avg: {status.performance.avgResponseTime}</div>
            </div>
          </div>
          
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-lg p-5">
                <h3 className="font-semibold mb-4">Data by Event Type</h3>
                <div className="space-y-2">
                  {stats.byEventType?.slice(0, 8).map((et: any) => (
                    <div key={et.event_type_code} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-text-secondary">{et.event_type_code || "Unknown"}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-text-muted">{et.count} records</span>
                        <span className="font-mono">${parseFloat(et.avg_price || 0).toFixed(0)} avg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-surface border border-border rounded-lg p-5">
                <h3 className="font-semibold mb-4">Data by Risk Zone</h3>
                <div className="space-y-2">
                  {stats.byRiskZone?.map((rz: any) => (
                    <div key={rz.risk_zone} className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${rz.risk_zone === "high" ? "bg-critical/20 text-critical" : rz.risk_zone === "medium" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
                        {rz.risk_zone || "Unknown"}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-text-muted">{rz.count} records</span>
                        <span className="font-mono">Risk: {parseFloat(rz.avg_risk || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {stats.acceptanceRate && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-text-muted mb-2">Quote Acceptance Rate</div>
                    <div className="flex items-center gap-4">
                      <span className="text-success">{stats.acceptanceRate.accepted} accepted</span>
                      <span className="text-critical">{stats.acceptanceRate.rejected} rejected</span>
                      <span className="text-text-muted">({((stats.acceptanceRate.accepted / stats.acceptanceRate.total) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Training Data Tab */}
      {tab === "data" && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm text-text-muted">{trainingData.length} records (showing latest 50)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-elevated/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-text-muted font-medium">ID</th>
                  <th className="px-4 py-2 text-left text-xs text-text-muted font-medium">Event Type</th>
                  <th className="px-4 py-2 text-left text-xs text-text-muted font-medium">Risk Zone</th>
                  <th className="px-4 py-2 text-left text-xs text-text-muted font-medium">Guards</th>
                  <th className="px-4 py-2 text-left text-xs text-text-muted font-medium">Crowd</th>
                  <th className="px-4 py-2 text-left text-xs text-text-muted font-medium">Price</th>
                  <th className="px-4 py-2 text-left text-xs text-text-muted font-medium">Accepted</th>
                  <th className="px-4 py-2 text-left text-xs text-text-muted font-medium">Date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trainingData.map(r => (
                  <tr key={r.id} className="hover:bg-elevated/30">
                    <td className="px-4 py-2 font-mono text-text-muted">{r.id}</td>
                    <td className="px-4 py-2">{r.event_type_code}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${r.risk_zone === "high" ? "bg-critical/20 text-critical" : r.risk_zone === "medium" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
                        {r.risk_zone}
                      </span>
                    </td>
                    <td className="px-4 py-2">{r.num_guards}</td>
                    <td className="px-4 py-2">{r.crowd_size?.toLocaleString()}</td>
                    <td className="px-4 py-2 font-mono">${parseFloat(r.final_price || "0").toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {r.was_accepted ? <span className="text-success">✓</span> : <span className="text-critical">✗</span>}
                    </td>
                    <td className="px-4 py-2 text-text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleDelete(r.id)} className="p-1 text-text-muted hover:text-critical">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Versions Tab */}
      {tab === "versions" && status && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="text-sm">Rolling back will change pricing calculations for all new quotes.</span>
          </div>
          
          {status.versions.map(v => (
            <div key={v.version} className={`p-5 bg-surface border rounded-lg ${v.active ? "border-accent" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold">{v.version}</span>
                    {v.active && <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded">Active</span>}
                  </div>
                  <div className="text-sm text-text-muted mb-2">{v.type} • Released {v.date}</div>
                  <div className="text-sm">Accuracy: <span className="text-success font-medium">{v.accuracy}%</span></div>
                </div>
                {!v.active && (
                  <button
                    onClick={() => handleRollback(v.version)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-warning/20 text-warning hover:bg-warning/30 rounded text-sm"
                  >
                    <RotateCcw className="w-4 h-4" /> {actionLoading === "rollback" ? "..." : "Rollback"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
