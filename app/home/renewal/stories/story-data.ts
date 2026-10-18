import { articles } from "@/lib/articles";

// The existing articles about field work and product development form the story collection.
// Awards and event coverage stay in the press/news area.
const storySlugs = ["250708", "251124"] as const;

export const stories = storySlugs.map((slug) => {
  const article = articles.find((item) => item.slug === slug);
  if (!article) throw new Error(`Missing existing story article: ${slug}`);
  return article;
});
