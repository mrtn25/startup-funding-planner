import styles from "./MotionButton.module.css";

type MotionButtonProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
  /** Widened to fit the label — the circle grows to fill this on hover. */
  width?: number;
};

/**
 * Circle-that-grows-into-a-pill link. The label is the accessible name; the
 * icon is decorative, so callers pass it already marked aria-hidden.
 */
export default function MotionButton({ href, label, icon, external, width = 232 }: MotionButtonProps) {
  return (
    <a
      className={styles.btn}
      href={href}
      style={{ width }}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <span className={styles.circle} aria-hidden="true" />
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
    </a>
  );
}
