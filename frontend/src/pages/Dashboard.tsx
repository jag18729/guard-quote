import { useNavigate } from "react-router-dom";
import BackgroundWrapper from "../components/BackgroundWrapper";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <BackgroundWrapper>
      <div className={styles.pageWrapper}>

        {/* =========================
           DASHBOARD CONTENT
        ========================= */}
        <main className={styles.dashboardContainer}>

          {/* HERO */}
          <section className={styles.hero}>
            <span className={styles.heroBadge}>LIVE SECURITY STATUS</span>
            <h1>Security Command Center</h1>
            <p>
              Monitor posture, analyze organizational risk, and act on
              expert-driven cybersecurity recommendations — all from a single,
              unified control plane.
            </p>
          </section>

          {/* KPI STATS */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h4>Total Reports</h4>
              <span className={styles.statValue}>4</span>
              <p>Generated assessments</p>
            </div>

            <div className={styles.statCard}>
              <h4>Security Score</h4>
              <span className={styles.statValue}>82</span>
              <p>Above industry baseline</p>
            </div>

            <div className={styles.statCard}>
              <h4>Open Risks</h4>
              <span className={styles.statValue}>7</span>
              <p>Actionable findings</p>
            </div>

            <div className={styles.statCard}>
              <h4>Active Solutions</h4>
              <span className={styles.statValue}>12</span>
              <p>Vendor recommendations</p>
            </div>
          </section>

          {/* REPORTS */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Recent Reports</h2>
              <button
                className={styles.secondaryBtn}
                onClick={() => navigate("/quote/business")}
              >
                Generate New Report
              </button>
            </div>

            <div className={styles.reportGrid}>
              {[1, 2, 3].map((r) => (
                <div key={r} className={styles.reportCard}>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportTag}>Enterprise</span>
                    <span className={styles.reportDate}>
                      Dec {8 + r}, 2024
                    </span>
                  </div>

                  <h3>Cybersecurity Assessment #{r}</h3>
                  <p>
                    Executive-level risk analysis covering endpoint, network,
                    cloud, and identity security controls.
                  </p>

                  <div className={styles.reportActions}>
                    <button
                      className={styles.viewBtn}
                      onClick={() => navigate("/report")}
                    >
                      View Report
                    </button>
                    <button className={styles.iconBtn}>⬇</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* NEXT ACTIONS */}
          <section className={styles.section}>
            <h2>Recommended Next Actions</h2>

            <div className={styles.actionList}>
              <div className={styles.actionItem}>
                <span className={`${styles.actionBadge} ${styles.high}`}>
                  High
                </span>
                Deploy endpoint detection & response (EDR) across unmanaged devices
              </div>

              <div className={styles.actionItem}>
                <span className={`${styles.actionBadge} ${styles.medium}`}>
                  Medium
                </span>
                Enforce conditional access and MFA for privileged accounts
              </div>

              <div className={styles.actionItem}>
                <span className={`${styles.actionBadge} ${styles.medium}`}>
                  Medium
                </span>
                Establish incident response and breach notification playbooks
              </div>
            </div>
          </section>

        </main>
      </div>
    </BackgroundWrapper>
  );
}
