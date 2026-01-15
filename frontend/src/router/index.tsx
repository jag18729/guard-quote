import { Routes, Route } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import AdminLayout from "../layouts/AdminLayout";
import AdminGuard from "../components/AdminGuard";

// Public pages
import Landing from "../pages/Landing";
import Loading from "../components/Loading";
import IndividualQuote from "../pages/IndividualQuote";
import BusinessQuote from "../pages/BusinessQuote";
import SecurityQuote from "../pages/SecurityQuote";
import Report from "../pages/Report";
import Dashboard from "../pages/Dashboard";
import UserPortal from "../pages/UserPortal";

// Admin pages
import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";

export default function AppRouter() {
  return (
    <Routes>
      {/* Public pages */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <Landing />
          </PublicLayout>
        }
      />

      <Route
        path="/loading"
        element={
          <PublicLayout>
            <Loading />
          </PublicLayout>
        }
      />

      <Route
        path="/quote/individual"
        element={
          <PublicLayout>
            <IndividualQuote />
          </PublicLayout>
        }
      />

      <Route
        path="/quote/business"
        element={
          <PublicLayout>
            <BusinessQuote />
          </PublicLayout>
        }
      />

      <Route
        path="/quote/security"
        element={
          <PublicLayout>
            <SecurityQuote />
          </PublicLayout>
        }
      />

      <Route
        path="/report"
        element={
          <PublicLayout>
            <Report />
          </PublicLayout>
        }
      />

      {/* Auth */}
      <Route
        path="/auth"
        element={
          <PublicLayout>
            <UserPortal />
          </PublicLayout>
        }
      />

      {/* Client Dashboard (authenticated area) */}
      <Route
        path="/dashboard"
        element={
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        }
      />

      {/* Admin Login (no auth required) */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AdminGuard>
        }
      />

      <Route
        path="/admin/users"
        element={
          <AdminGuard>
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          </AdminGuard>
        }
      />

      <Route
        path="/admin/quotes"
        element={
          <AdminGuard>
            <AdminLayout>
              <AdminQuotes />
            </AdminLayout>
          </AdminGuard>
        }
      />

      <Route
        path="/admin/clients"
        element={
          <AdminGuard>
            <AdminLayout>
              <AdminClients />
            </AdminLayout>
          </AdminGuard>
        }
      />

      <Route
        path="/admin/analytics"
        element={
          <AdminGuard>
            <AdminLayout>
              <AdminAnalytics />
            </AdminLayout>
          </AdminGuard>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <AdminGuard>
            <AdminLayout>
              <AdminSettings />
            </AdminLayout>
          </AdminGuard>
        }
      />
    </Routes>
  );
}

// Placeholder components for routes not yet created
function AdminQuotes() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Quote Management</h1>
      <p style={{ color: "rgba(255,255,255,0.6)" }}>Coming soon - manage all quotes here</p>
    </div>
  );
}

function AdminClients() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Client Management</h1>
      <p style={{ color: "rgba(255,255,255,0.6)" }}>Coming soon - manage all clients here</p>
    </div>
  );
}

function AdminAnalytics() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Analytics</h1>
      <p style={{ color: "rgba(255,255,255,0.6)" }}>Coming soon - view business analytics here</p>
    </div>
  );
}

function AdminSettings() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Settings</h1>
      <p style={{ color: "rgba(255,255,255,0.6)" }}>Coming soon - configure system settings here</p>
    </div>
  );
}
