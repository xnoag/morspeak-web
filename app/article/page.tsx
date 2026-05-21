import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "아티클 | 모스픽",
};

export default function ArticleListPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h1
          className="text-[28px] font-bold text-ms-dark mb-12"
          style={{ letterSpacing: "-0.01em" }}
        >
          아티클
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
                  {article.title}
                </h6>
                <span
                  className="text-[13px] text-ms-muted shrink-0"
                  style={{ letterSpacing: "-0.3px" }}
                >
                  {article.date}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
