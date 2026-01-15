import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../../context/AuthContext";
import styles from "./AdminDashboard.module.css";

interface DashboardStats {
  totalQuotes: number;
  totalRevenue: number;
  totalClients: number;
  totalUsers: number;
  recentQuotes: Array<{
    id: number;
    quote_number: string;
    total_price: number;
    status: string;
    created_at: string;
    company_name: string | null;
  }>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats", {
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            navigate("/admin/login");
            return;
          }
          throw new Error("Failed to fetch stats");
        }

        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      draft: styles.statusDraft,
      sent: styles.statusSent,
      accepted: styles.statusAccepted,
      rejected: styles.statusRejected,
    };
    return `${styles.statusBadge} ${statusStyles[status] || ""}`;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Dashboard Overview</h1>
        <p>Welcome back! Here's what's happening with your business.</p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.totalQuotes || 0}</span>
            <span className={styles.statLabel}>Total Quotes</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              ${(stats?.totalRevenue || 0).toLocaleString()}
            </span>
            <span className={styles.statLabel}>Total Revenue</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.totalClients || 0}</span>
            <span className={styles.statLabel}>Clients</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔐</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.totalUsers || 0}</span>
            <span className={styles.statLabel}>Active Users</span>
          </div>
        </div>
      </div>

      {/* Recent Quotes */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Quotes</h2>
          <button
            className={styles.viewAllBtn}
            onClick={() => navigate("/admin/quotes")}
          >
            View All →
          </button>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Quote #</span>
            <span>Client</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Date</span>
          </div>

          {stats?.recentQuotes?.length === 0 && (
            <div className={styles.emptyState}>
              <p>No quotes yet</p>
              <button onClick={() => navigate("/quote/security")}>
                Create First Quote
              </button>
            </div>
          )}

          {stats?.recentQuotes?.map((quote) => (
            <div key={quote.id} className={styles.tableRow}>
              <span className={styles.quoteNumber}>{quote.quote_number}</span>
              <span>{quote.company_name || "Guest"}</span>
              <span className={styles.amount}>
                ${(quote.total_price || 0).toLocaleString()}
              </span>
              <span className={getStatusBadge(quote.status)}>
                {quote.status}
              </span>
              <span className={styles.date}>
                {new Date(quote.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <button
            className={styles.actionCard}
            onClick={() => navigate("/quote/security")}
          >
            <span className={styles.actionIcon}>➕</span>
            <span>New Quote</span>
          </button>
          <button
            className={styles.actionCard}
            onClick={() => navigate("/admin/clients")}
          >
            <span className={styles.actionIcon}>👤</span>
            <span>Add Client</span>
          </button>
          <button
            className={styles.actionCard}
            onClick={() => navigate("/admin/users")}
          >
            <span className={styles.actionIcon}>🔑</span>
            <span>Manage Users</span>
          </button>
          <button
            className={styles.actionCard}
            onClick={() => navigate("/admin/analytics")}
          >
            <span className={styles.actionIcon}>📊</span>
            <span>View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}
