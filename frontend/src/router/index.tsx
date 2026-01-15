import { Routes, Route } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout";

import Landing from "../pages/Landing";
import Loading from "../components/Loading";
import IndividualQuote from "../pages/IndividualQuote";
import BusinessQuote from "../pages/BusinessQuote";
import Report from "../pages/Report";
import Dashboard from "../pages/Dashboard";
import UserPortal from "../pages/UserPortal";

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

      {/* Dashboard (authenticated area) */}
      <Route
        path="/dashboard"
        element={
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        }
      />
    </Routes>
  );
}
