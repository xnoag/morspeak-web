import type { Metadata } from "next";
import Link from "next/link";
import { stories } from "./story-data";
import styles from "./stories.module.css";

export const metadata: Metadata = {
  title: "모스픽 이야기 | 모스픽",
  description: "현장에서 배우고 제품을 만들어 온 모스픽의 기록을 읽어 보세요.",
};

export default function StoriesPage() {
  return (
    <main className={styles.page} lang="ko">
      <div className={styles.wrap}>
        <Link className={styles.back} href="/home/renewal#renewal-journal">← 모스픽 홈페이지</Link>
        <header className={styles.header}>
          <p className={styles.eyebrow}>모스픽 이야기</p>
          <h1>문제를 듣고, 만들고,<br />다시 살펴보는 과정.</h1>
          <p>모스픽이 직접 기록한 현장과 개발 이야기입니다. 외부 보도와 소식은 <Link href="/home/renewal#renewal-press">언론 영역</Link>에서 확인할 수 있습니다.</p>
        </header>
        <ol className={styles.list}>
          {stories.map((story) => (
            <li key={story.slug}>
              <Link className={styles.storyLink} href={`/home/renewal/stories/${story.slug}`}>
                <span className={styles.date}>{story.date}</span>
                <h2>{story.title}</h2>
                <p>{story.paragraphs[0]}</p>
                <span className={styles.read}>이야기 읽기 →</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
