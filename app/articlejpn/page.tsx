import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "記事 | モースピーク",
};

const titleMap: Record<string, string> = {
  "251205": "アサン財団非営利スタートアップ最優秀賞",
  "251124": "Let'Swiftで語ったモースピークの歩み",
  "250708": "国内から始める確かな解決事例",
  "250609": "アップルCEOティム・クック氏の前で紹介されたモースピーク",
};

const dateMap: Record<string, string> = {
  "251205": "2025年12月5日",
  "251124": "2025年11月24日",
  "250708": "2025年7月8日",
  "250609": "2025年6月9日",
};

export default function ArticleJpnPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h1
          className="text-[28px] font-bold text-ms-dark mb-12"
          style={{ letterSpacing: "-0.01em" }}
        >
          記事
        </h1>
        <ul className="flex flex-col divide-y divide-[#f0f0f0]">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/articles/${article.slug}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6 gap-2 group"
              >
                <h6
                  className="text-[16px] font-medium text-ms-dark group-hover:opacity-60 transition-opacity"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {titleMap[article.slug] ?? article.title}
                </h6>
                <span
                  className="text-[13px] text-ms-muted shrink-0"
                  style={{ letterSpacing: "-0.3px" }}
                >
                  {dateMap[article.slug] ?? article.date}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
