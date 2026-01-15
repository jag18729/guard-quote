import styles from "./FooterMinimal.module.css";

export default function FooterMinimal() {
  return (
    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} GuardQuote</span>
      <span>Precision cybersecurity insights</span>
    </footer>
  );
}
