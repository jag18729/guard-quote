import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import Landing from "./pages/Landing";
import QuoteForm from "./pages/QuoteForm";
import QuoteLookup from "./pages/QuoteLookup";
import Login from "./pages/Login";
import TechStack from "./pages/TechStack";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Services from "./pages/admin/Services";
import QuoteRequests from "./pages/admin/QuoteRequests";
import ML from "./pages/admin/ML";
import Security from "./pages/admin/Security";
import Blog from "./pages/admin/Blog";
import Features from "./pages/admin/Features";
import Profile from "./pages/admin/Profile";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-void flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "admin" && user?.role !== "iam") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/quote" element={<QuoteForm />} />
        <Route path="/quote/lookup" element={<QuoteLookup />} />
        <Route path="/quote/:type" element={<QuoteForm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/tech-stack" element={<TechStack />} />
      </Route>
      
      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<AdminOnlyRoute><Users /></AdminOnlyRoute>} />
        <Route path="services" element={<Services />} />
        <Route path="quotes" element={<QuoteRequests />} />
        <Route path="ml" element={<ML />} />
        <Route path="security" element={<Security />} />
        <Route path="blog" element={<Blog />} />
        <Route path="features" element={<Features />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
