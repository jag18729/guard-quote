import { useServiceStatus } from "../context/ServiceStatusContext";
import styles from "./FooterMinimal.module.css";

export default function FooterMinimal() {
  const { status } = useServiceStatus();

  const getStatusColor = (state: "online" | "offline" | "checking") => {
    if (state === "online") return "#4caf50";
    if (state === "offline") return "#f44336";
    return "#ff9800";
  };

  return (
    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} GuardQuote</span>

      <div className={styles.statusGroup}>
        {status.demoMode && (
          <span className={styles.demoMode}>Demo Mode</span>
        )}

        <div className={styles.statusIndicator}>
          <span
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor(status.database) }}
          />
          <span className={styles.statusLabel}>DB</span>
        </div>

        <div className={styles.statusIndicator}>
          <span
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor(status.mlEngine) }}
          />
          <span className={styles.statusLabel}>ML</span>
        </div>
      </div>
    </footer>
  );
}
