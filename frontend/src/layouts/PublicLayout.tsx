// layouts/PublicLayout.tsx
import BackgroundWrapper from "../components/BackgroundWrapper";
import PublicNavbar from "../components/PublicNavbar";
import FooterMinimal from "../components/FooterMinimal";

export default function PublicLayout({ children }) {
  return (
    <BackgroundWrapper>
      <PublicNavbar />
      <div style={{ paddingTop: "68px" }}>
        {children}
      </div>
      <FooterMinimal />
    </BackgroundWrapper>
  );
}
