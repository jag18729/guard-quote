// layouts/PublicLayout.tsx
import BackgroundWrapper from "../components/BackgroundWrapper";
import FooterMinimal from "../components/FooterMinimal";

export default function PublicLayout({ children }) {
  return (
    <BackgroundWrapper>
      {children}
      <FooterMinimal />
    </BackgroundWrapper>
  );
}
