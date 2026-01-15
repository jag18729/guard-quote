import { useNavigate } from "react-router-dom";
import BackgroundWrapper from "../components/BackgroundWrapper";
import styles from "./Report.module.css";

const reportData = {
  company: "Example Corp",
  date: "December 10, 2024",
  securityScore: 82,
  summary:
    "Your organization maintains a moderately strong cybersecurity posture, performing above industry average in perimeter security controls. However, several core areas — including endpoint visibility, cloud IAM hygiene, and incident readiness — present material risk exposure that should be addressed within the next 90 days.",
  risks: [
    {
      title: "Endpoint Exposure",
      desc:
        "Approximately 40% of company-managed devices lack modern EDR/AV coverage, increasing ransomware susceptibility.",
    },
    {
      title: "Cloud Identity Weakness",
      desc:
        "Misconfigured IAM permissions allow elevated access paths, exposing critical data assets to insider and external threats.",
    },
    {
      title: "No Incident Response Program",
      desc:
        "The absence of a formal IR plan increases recovery time and organizational impact in the event of a breach.",
    },
  ],
  recommendations: [
    {
      solution: "CrowdStrike Falcon EDR",
      benefit: "Real-time endpoint threat detection and device-level response.",
      cost: "$550 / month",
    },
    {
      solution: "Azure AD Identity Protection",
      benefit:
        "Adaptive MFA, risk-based conditional access, and IAM governance.",
      cost: "$300 / month",
    },
    {
      solution: "Rapid7 Managed Threat Response",
      benefit:
        "24/7 expert SOC coverage, incident triage, and proactive detection.",
      cost: "$940 / month",
    },
  ],
  budgetBreakdown: [
    { area: "Network Security: ", value: 30 },
    { area: "Endpoint Security: ", value: 40 },
    { area: "Cloud Security: ", value: 20 },
    { area: "Threat Intelligence: ", value: 10 },
  ],
  nextSteps:
    "Deploy EDR across all endpoints, enforce identity hardening with adaptive MFA, onboard to a managed SOC provider, and schedule quarterly penetration testing.",
};

export default function Report() {
  const navigate = useNavigate();

  return (
    <BackgroundWrapper>
      <div className={styles.pageWrapper}>

        {/* AUTH CTA */}
        <div className={styles.headerActions}>
          <button
            className={styles.authCtaBtn}
            onClick={() => navigate("/auth")}
          >
            Log In / Sign Up →
          </button>
        </div>

        {/* REPORT CONTAINER */}
        <div className={styles.reportContainer}>
          <header className={styles.reportHeader}>
            <h1>Executive Cybersecurity Posture Report</h1>
            <p>
              <strong>For:</strong> {reportData.company} &nbsp;•&nbsp;
              <strong>Date:</strong> {reportData.date}
            </p>
          </header>

          <section className={styles.section}>
            <h2>Executive Summary</h2>
            <p>{reportData.summary}</p>
          </section>

          <section className={styles.section}>
            <h2>Security Score</h2>
            <div className={styles.scoreBox}>
              {reportData.securityScore}/100
            </div>
          </section>

          <section className={styles.section}>
            <h2>Key Risk Findings</h2>
            <div className={styles.riskGrid}>
              {reportData.risks.map((risk, index) => (
                <div key={index} className={styles.riskCard}>
                  <h4>{risk.title}</h4>
                  <p>{risk.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2>Recommended Actions & Solutions</h2>
            <div className={styles.solutionGrid}>
              {reportData.recommendations.map((rec, index) => (
                <div key={index} className={styles.solutionCard}>
                  <h4>{rec.solution}</h4>
                  <p>{rec.benefit}</p>
                  <span className={styles.costTag}>{rec.cost}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2>Budget Allocation</h2>
            <div className={styles.budgetGrid}>
              {reportData.budgetBreakdown.map((b, i) => (
                <div key={i} className={styles.budgetItem}>
                  <span>{b.area}</span>
                  <span>{b.value}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2>Next Steps</h2>
            <p>{reportData.nextSteps}</p>
          </section>

          <footer className={styles.downloadFooter}>
            <button className={styles.downloadBtn}>Download PDF</button>
            <button className={styles.downloadBtn}>Download CSV</button>
            <button className={styles.downloadBtn}>Download DOCX</button>
          </footer>
        </div>
      </div>
    </BackgroundWrapper>
  );
}
