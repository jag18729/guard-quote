import { useState, useEffect } from "react";
import { getAuthHeaders } from "../../context/AuthContext";
import { FileText, Filter, Search, Eye, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";

interface QuoteRequest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  event_type: string;
  location: string;
  guest_count: number;
  duration_hours: number;
  budget: number;
  status: string;
  notes: string;
  created_at: string;
}

export default function QuoteRequests() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<QuoteRequest | null>(null);
  
  const fetchRequests = async () => {
    const res = await fetch("/api/admin/quote-requests", { headers: getAuthHeaders() });
    const data = await res.json();
    setRequests(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  
  useEffect(() => { fetchRequests(); }, []);
  
  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/quote-requests/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    fetchRequests();
    if (selected?.id === id) setSelected({ ...selected, status });
  };
  
  const filtered = requests.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (r.first_name || "").toLowerCase().includes(s) || (r.last_name || "").toLowerCase().includes(s) || (r.email || "").toLowerCase().includes(s);
    }
    return true;
  });
  
  const statusStyles: Record<string, string> = {
    pending: "bg-warning/20 text-warning",
    reviewed: "bg-blue-500/20 text-blue-400",
    quoted: "bg-purple-500/20 text-purple-400",
    accepted: "bg-success/20 text-success",
    rejected: "bg-critical/20 text-critical",
  };
  
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };
  
  if (loading) return <div className="p-8 text-text-secondary">Loading requests...</div>;
  
  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Quote Requests</h1>
          <p className="text-text-secondary text-sm">Review and manage incoming quote requests</p>
        </div>
      </div>
      
      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          {["all", "pending", "reviewed", "quoted", "accepted", "rejected"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded capitalize transition ${filter === f ? "bg-accent text-void" : "bg-surface border border-border text-text-secondary hover:text-text-primary"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {["pending", "reviewed", "quoted", "accepted", "rejected"].map(status => {
          const count = requests.filter(r => r.status === status).length;
          return (
            <div key={status} className="p-3 bg-surface border border-border rounded-lg text-center">
              <div className={`text-xl font-bold ${statusStyles[status]?.split(" ")[1] || "text-text-muted"}`}>{count}</div>
              <div className="text-[10px] text-text-muted uppercase">{status}</div>
            </div>
          );
        })}
      </div>
      
      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 bg-surface border border-border rounded-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No quote requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[65vh] overflow-y-auto">
              {filtered.map(req => (
                <div
                  key={req.id}
                  onClick={() => setSelected(req)}
                  className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition ${selected?.id === req.id ? "bg-accent/10" : "hover:bg-elevated/30"}`}
                >
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                    {(req.first_name?.[0] || "?")}{(req.last_name?.[0] || "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{req.first_name} {req.last_name}</div>
                    <div className="text-xs text-text-muted truncate">{req.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">${req.budget}/mo</div>
                    <div className="text-xs text-text-muted">{timeAgo(req.created_at)}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded ${statusStyles[req.status]}`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Detail panel */}
        {selected && (
          <div className="w-96 bg-surface border border-border rounded-lg p-5 h-fit sticky top-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{selected.first_name} {selected.last_name}</h3>
                <p className="text-sm text-text-secondary">{selected.email}</p>
              </div>
              <span className={`px-2 py-0.5 text-xs font-mono uppercase rounded ${statusStyles[selected.status]}`}>
                {selected.status}
              </span>
            </div>
            
            <div className="space-y-3 mb-6">
              {[
                { label: "Phone", value: selected.phone || "—" },
                { label: "Company", value: selected.company_name || "—" },
                { label: "Event Type", value: selected.event_type || "—" },
                { label: "Location", value: selected.location || "—" },
                { label: "Guests", value: selected.guest_count?.toString() || "—" },
                { label: "Duration", value: selected.duration_hours ? `${selected.duration_hours}h` : "—" },
                { label: "Budget", value: `$${selected.budget}/mo` },
                { label: "Submitted", value: new Date(selected.created_at).toLocaleString() },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-text-muted">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
            
            {selected.notes && (
              <div className="mb-6">
                <div className="text-xs text-text-muted uppercase mb-1">Notes</div>
                <p className="text-sm text-text-secondary">{selected.notes}</p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {selected.status === "pending" && (
                <>
                  <button onClick={() => updateStatus(selected.id, "reviewed")} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-sm">
                    <Eye className="w-4 h-4" /> Mark Reviewed
                  </button>
                  <button onClick={() => updateStatus(selected.id, "quoted")} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded text-sm">
                    <DollarSign className="w-4 h-4" /> Send Quote
                  </button>
                </>
              )}
              {selected.status === "quoted" && (
                <>
                  <button onClick={() => updateStatus(selected.id, "accepted")} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/20 text-success hover:bg-success/30 rounded text-sm">
                    <CheckCircle className="w-4 h-4" /> Accept
                  </button>
                  <button onClick={() => updateStatus(selected.id, "rejected")} className="flex items-center gap-1.5 px-3 py-1.5 bg-critical/20 text-critical hover:bg-critical/30 rounded text-sm">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              {selected.status !== "pending" && selected.status !== "quoted" && (
                <button onClick={() => updateStatus(selected.id, "pending")} className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-elevated rounded text-sm">
                  <Clock className="w-4 h-4" /> Reset to Pending
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
