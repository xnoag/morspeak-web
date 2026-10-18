import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stories } from "../story-data";
import styles from "../stories.module.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return stories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = stories.find((item) => item.slug === slug);
  return { title: story ? `${story.title} | 모스픽 이야기` : "모스픽 이야기" };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = stories.find((item) => item.slug === slug);
  if (!story) notFound();

  return (
    <main className={styles.page} lang="ko">
      <article className={`${styles.wrap} ${styles.article}`}>
        <Link className={styles.back} href="/home/renewal/stories">← 이야기 목록</Link>
        <header className={styles.header}>
          <p className={styles.eyebrow}>모스픽 이야기</p>
          <h1>{story.title}</h1>
          <p className={styles.date}>{story.date}</p>
        </header>
        <div className={styles.body}>
          {story.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
        <Link className={styles.endLink} href="/home/renewal/stories">이야기 목록으로 돌아가기 →</Link>
      </article>
    </main>
  );
}
