import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/lib/articles";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) return {};
  return { title: `${article.title} - 모스픽 | Morspeak` };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);

  if (!article) notFound();

  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[680px] mx-auto">
        <Link
          href="/article"
          className="inline-flex text-[13px] text-ms-muted hover:opacity-70 transition-opacity mb-10"
          style={{ letterSpacing: "-0.3px" }}
        >
          ‹ 목록으로
        </Link>

        <h1
          className="text-[28px] md:text-[34px] font-bold text-ms-dark mb-3 leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {article.title}
        </h1>
        <p
          className="text-[13px] text-ms-muted mb-12"
          style={{ letterSpacing: "-0.3px" }}
        >
          {article.date}
        </p>

        <div className="flex flex-col gap-5">
          {article.paragraphs.map((para, i) => (
            <p
              key={i}
              className="text-[16px] text-ms-body leading-relaxed"
              style={{ letterSpacing: "-0.01em", lineHeight: "1.8em" }}
            >
              {para}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
