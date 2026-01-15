import BackgroundWrapper from "../components/BackgroundWrapper";
import styles from "./Loading.module.css";

export default function Loading() {
  return (
    <BackgroundWrapper>
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>

        <h2 className={styles.message}>
          Analyzing your security needs…
        </h2>

        <p className={styles.subtext}>
          Crafting a tailored recommendation
        </p>
      </div>
    </BackgroundWrapper>
  );
}
