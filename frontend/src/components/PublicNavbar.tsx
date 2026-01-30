import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./PublicNavbar.module.css";

export default function PublicNavbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <header className={styles.navbar}>
      {/* LEFT - BRAND */}
      <div className={styles.brand} onClick={() => navigate("/")}>
        <span className={styles.logo}>GuardQuote</span>
        <span className={styles.tagline}>Security Intelligence</span>
      </div>

      {/* RIGHT - AUTH */}
      <div className={styles.authGroup}>
        {user ? (
          <>
            <span className={styles.greeting}>Hello, <strong>{user.firstName}</strong></span>
            <button
              className={styles.authBtn}
              onClick={() => navigate("/admin/dashboard")}
            >
              Dashboard
            </button>
            <button
              className={styles.logoutBtn}
              onClick={() => { logout(); navigate("/"); }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              className={styles.loginBtn}
              onClick={() => navigate("/admin/login")}
            >
              Login
            </button>
            <button
              className={styles.signupBtn}
              onClick={() => navigate("/admin/login")}
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </header>
  );
}
