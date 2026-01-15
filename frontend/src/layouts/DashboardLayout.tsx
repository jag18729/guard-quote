// layouts/DashboardLayout.tsx
import BackgroundWrapper from "../components/BackgroundWrapper";
import Navbar from "../components/Navbar";
import FooterDashboard from "../components/FooterDashboard";

export default function DashboardLayout({ children }) {
  return (
    <BackgroundWrapper>
      <Navbar />
      {children}
      <FooterDashboard />
    </BackgroundWrapper>
  );
}
