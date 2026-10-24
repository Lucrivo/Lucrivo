import Image from "next/image";

import notebook from "@/assets/auth/notebook-auth.png";
import mark from "@/assets/brand/lucrivo-logo.svg";
import ebook from "@/assets/marketing/ebook-pricing-guide.png";

import styles from "./auth-scene.module.css";

function AuthScene() {
  return (
    <section className={styles.story}>
      <div className={styles.copy}>
        <div className={styles.brand}>
          <span className={styles.mark}>
            <Image src={mark} alt="" className={styles.markImage} />
          </span>
          <span className={styles.word}>Lucrivo</span>
        </div>
        <p className={styles.headline}>
          Descubra se o seu preço está dando{" "}
          <span className={styles.loss}>prejuízo.</span>
        </p>
        <p className={styles.benefit}>Comece com um diagnóstico gratuito.</p>
      </div>
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.notebook}>
          <Image
            src={notebook}
            alt=""
            priority
            sizes="(max-width: 74.99rem) 1px, 32rem"
            className={styles.photo}
          />
        </div>
        <div className={styles.book}>
          <Image
            src={ebook}
            alt=""
            priority
            sizes="(max-width: 74.99rem) 1px, 13rem"
            className={styles.photo}
          />
        </div>
      </div>
    </section>
  );
}

export { AuthScene };
