import styles from "./BackgroundWrapper.module.css";

export default function BackgroundWrapper({ children }) {
  return (
    <div className={styles.globalBackground}>
      <div className={styles.horizonGrid}></div>
      <div className={styles.scanLines}></div>
      <div className={styles.particles}></div>

      <div className={styles.innerContent}>{children}</div>
    </div>
  );
}
