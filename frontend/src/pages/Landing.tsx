import { Link } from "react-router-dom";
import styles from "./Landing.module.css";

export default function Landing() {
  return (
    <div className={styles.wrapper}>
      {/* Hero Content */}
      <div className={styles.content}>
        <h1 className={styles.title}>GuardQuote</h1>

        <p className={styles.subtitle}>
          Intelligent network & security solutions tailored to your world.
        </p>

        <div className={styles.cardContainer}>
          <div className={styles.card}>
            <h2>For Individuals</h2>
            <p>Protect your home network with AI-driven recommendations.</p>

            <Link to="/quote/individual" className={styles.btn}>
              Request Individual Quote
            </Link>
          </div>

          <div className={styles.card}>
            <h2>For Businesses</h2>
            <p>Enterprise-grade cybersecurity guidance built for scale.</p>

            <Link to="/quote/business" className={styles.btn}>
              Request Business Quote
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
