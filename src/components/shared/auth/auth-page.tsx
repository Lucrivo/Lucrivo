import { AuthScene } from "@/components/shared/auth/auth-scene";

import styles from "./auth-scene.module.css";

function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <main className={`${styles.scene} dark`}>
      <div className={styles.layout}>
        <AuthScene />
        <section className={styles.panel}>{children}</section>
      </div>
    </main>
  );
}

export { AuthPage };
