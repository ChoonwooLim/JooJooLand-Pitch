import styles from './AuroraBackground.module.css';

export default function AuroraBackground({ intensity = 1 }) {
  return (
    <div className={styles.wrap} style={{ opacity: intensity }} aria-hidden>
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      <div className={`${styles.blob} ${styles.blob3}`} />
      <div className={styles.grid} />
    </div>
  );
}
