import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAuthHeaders, useAuth } from "../../context/AuthContext";
import { FileText, DollarSign, Users, TrendingUp, ArrowRight, Clock, AlertCircle } from "lucide-react";

interface Stats {
  totalQuotes: number;
  totalRevenue: number;
  totalClients: number;
  totalUsers: number;
  recentQuotes: Array<{ id: number; quote_number: string; total_price: number; status: string; created_at: string; company_name: string | null }>;
}

interface QuoteRequest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  budget: number;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats", { headers: getAuthHeaders() }).then(r => r.json()),
      fetch("/api/admin/quote-requests", { headers: getAuthHeaders() }).then(r => r.json()),
    ]).then(([s, r]) => {
      setStats(s);
      setRequests(Array.isArray(r) ? r : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  
  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };
  
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };
  
  const statusColor = (s: string) => {
    const colors: Record<string, string> = {
      pending: "bg-warning/20 text-warning",
      reviewed: "bg-blue-500/20 text-blue-400",
      quoted: "bg-purple-500/20 text-purple-400",
      accepted: "bg-success/20 text-success",
      rejected: "bg-critical/20 text-critical",
    };
    return colors[s] || "bg-text-muted/20 text-text-muted";
  };
  
  const pending = requests.filter(r => r.status === "pending");
  
  if (loading) {
    return <div className="p-8 text-text-secondary">Loading dashboard...</div>;
  }
  
  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">{getGreeting()}, {user?.firstName}</h1>
        <p className="text-text-secondary text-sm">Here's what's happening with GuardQuote today</p>
      </div>
      
      {/* Alert */}
      {pending.length > 0 && (
        <Link to="/admin/quotes" className="flex items-center gap-3 p-4 mb-6 bg-warning/10 border border-warning/30 rounded-lg hover:bg-warning/15 transition">
          <AlertCircle className="w-5 h-5 text-warning" />
          <span className="flex-1 text-sm"><strong>{pending.length}</strong> quote request{pending.length !== 1 && "s"} waiting for review</span>
          <ArrowRight className="w-4 h-4 text-warning" />
        </Link>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: FileText, label: "Quote Requests", value: requests.length, color: "text-accent", badge: pending.length > 0 ? `${pending.length} new` : null },
          { icon: DollarSign, label: "Total Revenue", value: `$${(stats?.totalRevenue || 0).toLocaleString()}`, color: "text-success" },
          { icon: Users, label: "Clients", value: stats?.totalClients || 0, color: "text-blue-400" },
          { icon: TrendingUp, label: "Users", value: stats?.totalUsers || 0, color: "text-purple-400" },
        ].map((stat, i) => (
          <div key={i} className="p-5 bg-surface border border-border rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              {stat.badge && <span className="px-2 py-0.5 bg-warning/20 text-warning text-[10px] font-mono rounded">{stat.badge}</span>}
            </div>
            <div className="text-2xl font-bold mb-0.5">{stat.value}</div>
            <div className="text-xs text-text-muted font-mono uppercase">{stat.label}</div>
          </div>
        ))}
      </div>
      
      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent requests */}
        <div className="bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Recent Quote Requests</h2>
            <Link to="/admin/quotes" className="text-xs text-accent hover:underline">View all →</Link>
          </div>
          
          {requests.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No quote requests yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {requests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex items-center gap-4 px-5 py-3 hover:bg-elevated/50 transition">
                  <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                    {(req.first_name?.[0] || "?")}{(req.last_name?.[0] || "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{req.first_name} {req.last_name}</div>
                    <div className="text-xs text-text-muted">${req.budget}/mo · {timeAgo(req.created_at)}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded ${statusColor(req.status)}`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick actions */}
        <div className="bg-surface border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Quick Actions</h2>
          </div>
          
          <div className="p-2">
            {[
              { to: "/admin/quotes", icon: FileText, title: "Review Requests", desc: "Review and respond to quote requests" },
              { to: "/admin/users", icon: Users, title: "Manage Users", desc: "Add admins and manage access" },
              { to: "/admin/services", icon: Clock, title: "Services", desc: "Monitor system services" },
              { to: "/", icon: ArrowRight, title: "Public Site", desc: "View the customer experience", external: true },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                target={action.external ? "_blank" : undefined}
                className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-elevated transition"
              >
                <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center">
                  <action.icon className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-text-muted">{action.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
