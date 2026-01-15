import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UserPortal.module.css";

export default function UserPortal() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const navigate = useNavigate();

  // =========================
  // FEDERATED LOGIN (DEMO)
  // =========================
  const handleFederatedLogin = (
    provider: "google" | "github" | "microsoft"
  ) => {
    console.log(`Federated login with ${provider}`);

    // TODO: replace with Auth0 / Clerk / Cognito callback
    // TEMP: assume success
    navigate("/dashboard");
  };

  // =========================
  // EMAIL / PASSWORD LOGIN (DEMO)
  // =========================
  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();

    console.log(`${mode} with email/password`);

    // TODO: replace with real auth validation
    // TEMP: assume success
    navigate("/dashboard");
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Back */}
      <button className={styles.backBtn} onClick={() => navigate("/")}>
        ← Back
      </button>

      {/* Auth Box */}
      <div className={styles.authBox}>
        <h1 className={styles.title}>
          {mode === "login" ? "Welcome Back" : "Create Your Account"}
        </h1>

        <p className={styles.subtitle}>
          {mode === "login"
            ? "Access your security intelligence dashboard"
            : "Start generating professional cybersecurity insights"}
        </p>

        {/* =========================
            FEDERATED LOGIN
        ========================= */}
        <div className={styles.federation}>
          <button
            className={`${styles.federationBtn} ${styles.google}`}
            onClick={() => handleFederatedLogin("google")}
          >
            Continue with Google
          </button>

          <button
            className={`${styles.federationBtn} ${styles.github}`}
            onClick={() => handleFederatedLogin("github")}
          >
            Continue with GitHub
          </button>

          <button
            className={`${styles.federationBtn} ${styles.microsoft}`}
            onClick={() => handleFederatedLogin("microsoft")}
          >
            Continue with Microsoft
          </button>
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span>or continue with email</span>
        </div>

        {/* =========================
            EMAIL / PASSWORD FORM
        ========================= */}
        <form className={styles.form} onSubmit={handleEmailAuth}>
          {mode === "signup" && (
            <div className={styles.field}>
              <label>Full Name</label>
              <input type="text" placeholder="Jane Doe" />
            </div>
          )}

          <div className={styles.field}>
            <label>Email</label>
            <input type="email" placeholder="you@company.com" />
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input type="password" placeholder="••••••••" />
          </div>

          {mode === "signup" && (
            <div className={styles.field}>
              <label>Confirm Password</label>
              <input type="password" placeholder="••••••••" />
            </div>
          )}

          <button type="submit" className={styles.primaryBtn}>
            {mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        {/* Switch Mode */}
        <div className={styles.switchMode}>
          {mode === "login" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => setMode("signup")}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
