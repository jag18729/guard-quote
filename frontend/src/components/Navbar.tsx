import { useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className={styles.navbar}>
      {/* LEFT — BRAND */}
      <div className={styles.brand} onClick={() => navigate("/")}>
        <span className={styles.logo}>GuardQuote</span>
        <span className={styles.tagline}>Cybersecurity Intelligence</span>
      </div>

      {/* CENTER — NAV LINKS */}
      <nav className={styles.navLinks}>
        <button onClick={() => navigate("/dashboard")}>Overview</button>
        <button onClick={() => navigate("/reports")}>Reports</button>
        <button onClick={() => navigate("/quotes")}>Quotes</button>
        <button onClick={() => navigate("/settings")}>Settings</button>
      </nav>

      {/* RIGHT — AUTH */}
      <button
        className={styles.authBtn}
        onClick={() => navigate("/login")}
      >
        Log Out
      </button>
    </header>
  );
}
