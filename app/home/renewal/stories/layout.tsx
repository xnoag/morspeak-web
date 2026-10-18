import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { pc } from "../assets";
import styles from "./stories.module.css";

export default function StoriesLayout({ children }: { children: ReactNode }) {
  return <>
    <header className={styles.brandBar}>
      <Link href="/home/renewal" aria-label="모스픽 리뉴얼 홈페이지">
        <Image src={pc.imgMorspeakLogoWhiteOriginalRgbVectors} alt="Morspeak" width={150} height={32} unoptimized />
      </Link>
      <Link href="/home/renewal/stories">모스픽 이야기</Link>
    </header>
    {children}
    <footer className={styles.footer}>
      <Link href="/home/renewal">Morspeak · Small, Yet Significant.</Link>
      <Link href="/legalpolicies">개인정보 및 이용 안내</Link>
    </footer>
  </>;
}
