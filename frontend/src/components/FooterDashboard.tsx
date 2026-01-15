import styles from "./FooterDashboard.module.css";

export default function FooterDashboard() {
  return (
    <footer className={styles.footer}>
      <div>
        <strong>GuardQuote</strong>
        <span>Enterprise Security Intelligence</span>
      </div>

      <nav>
        <a href="#">Docs</a>
        <a href="#">Support</a>
        <a href="#">Security</a>
        <a href="#">Status</a>
      </nav>

      <span>© {new Date().getFullYear()}</span>
    </footer>
  );
}
