import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import Landing from "./pages/Landing";
import QuoteForm from "./pages/QuoteForm";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Services from "./pages/admin/Services";
import Logs from "./pages/admin/Logs";
import QuoteRequests from "./pages/admin/QuoteRequests";
import ML from "./pages/admin/ML";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-void flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  console.log("App component rendering");
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/quote" element={<QuoteForm />} />
        <Route path="/quote/:type" element={<QuoteForm />} />
        <Route path="/login" element={<Login />} />
      </Route>
      
      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="services" element={<Services />} />
        <Route path="logs" element={<Logs />} />
        <Route path="quotes" element={<QuoteRequests />} />
        <Route path="ml" element={<ML />} />
      </Route>
    </Routes>
  );
}
