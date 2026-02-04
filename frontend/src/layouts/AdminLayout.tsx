import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Shield, LayoutDashboard, Users, Server, ScrollText, FileText, LogOut, ExternalLink, Brain } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [systemStatus, setSystemStatus] = useState<"online" | "degraded" | "offline">("online");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    fetch("/api/status")
      .then(r => r.json())
      .then(d => setSystemStatus(d.database?.connected ? "online" : "degraded"))
      .catch(() => setSystemStatus("offline"));
  }, []);
  
  const handleLogout = () => { logout(); navigate("/login"); };

  const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/quotes", icon: FileText, label: "Quotes" },
    { to: "/admin/ml", icon: Brain, label: "ML Engine" },
    { to: "/admin/users", icon: Users, label: "Users" },
    { to: "/admin/services", icon: Server, label: "Services" },
    { to: "/admin/logs", icon: ScrollText, label: "Logs" },
  ];
  
  return (
    <div className="min-h-screen bg-void flex">
      {/* Sidebar */}
      <aside className="w-56 bg-surface border-r border-border flex flex-col fixed inset-y-0 left-0">
        {/* Logo */}
        <div className="h-14 px-4 flex items-center border-b border-border">
          <Shield className="w-5 h-5 text-accent mr-2" />
          <span className="font-semibold text-sm tracking-wide">GUARD<span className="text-accent">QUOTE</span></span>
        </div>
        
        {/* Status bar */}
        <div className="px-4 py-3 border-b border-border bg-elevated/50">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full status-pulse ${systemStatus === "online" ? "bg-success" : systemStatus === "degraded" ? "bg-warning" : "bg-critical"}`} />
              <span className="uppercase">{systemStatus}</span>
            </div>
            <span>{currentTime.toLocaleTimeString("en-US", { hour12: false })}</span>
          </div>
        </div>
        
        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded transition ${
                  isActive ? "text-accent bg-accent-muted" : "text-text-secondary hover:text-text-primary hover:bg-elevated"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        
        {/* External links */}
        <div className="px-2 pb-2 space-y-1">
          <a href="/" target="_blank" className="flex items-center gap-3 px-3 py-2 text-xs text-text-muted hover:text-text-secondary transition">
            <ExternalLink className="w-3.5 h-3.5" />
            Public Site
          </a>
          <a href="https://vandine.us" target="_blank" className="flex items-center gap-3 px-3 py-2 text-xs text-text-muted hover:text-text-secondary transition">
            <ExternalLink className="w-3.5 h-3.5" />
            NOC Dashboard
          </a>
        </div>
        
        {/* User */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-[10px] text-text-muted font-mono truncate">{user?.email}</div>
            </div>
            <button onClick={handleLogout} className="p-1.5 text-text-muted hover:text-critical hover:bg-critical/10 rounded transition" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 ml-56">
        <Outlet />
      </main>
    </div>
  );
}
