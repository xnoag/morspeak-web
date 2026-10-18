import { articles } from "@/lib/articles";

type Story = {
  slug: string;
  title: string;
  date: string;
  paragraphs: string[];
  provenance: {
    authorType: "모스픽 기존 글";
    originalSource: string;
    publicationDate: string;
    reuseScope: "개발 과정 요약";
  };
};

// Dates and source links come from existing team articles. Their unverified
// counts, quotations and outcome claims are excluded from these summaries.
const summaries: Pick<Story, "slug" | "title" | "paragraphs">[] = [
  {
    slug: "250708",
    title: "국내에서 사용 과정을 살펴본 기록",
    paragraphs: [
      "모스픽은 움직임이 제한된 사람이 일상에서 어떤 방식으로 의사를 전하는지 살피며 제품 방향을 다듬어 왔습니다. 기존 글은 국내 현장에서 사용 환경을 가까이서 확인하려 했던 배경을 기록합니다.",
      "현장에서는 사용할 수 있는 움직임과 기기 배치, 실제 조작 중 생기는 어려움을 함께 살펴봅니다. 이 과정에서 들은 의견은 입력 방식과 이용 안내를 다시 검토하는 자료가 됩니다.",
      "이 글은 개발 과정을 소개합니다. 특정 사용자에게 효과가 확인되었다는 사례나 일반적인 사용 성과로 해석할 수 없습니다.",
    ],
  },
  {
    slug: "251124",
    title: "Let’Swift에서 전한 개발 이야기",
    paragraphs: [
      "모스픽의 기존 글은 Let’Swift 발표에서 아이패드 앱을 만들게 된 배경과 눈 깜빡임 입력 기술의 개발 과정을 공유했다고 기록합니다.",
      "발표 내용은 기술과 문제의식을 소개하는 자료입니다. 실제 사용 가능 여부는 개인의 움직임과 사용 환경을 살피는 평가 과정에서 확인해야 합니다.",
    ],
  },
];

export const stories: Story[] = summaries.map((summary) => {
  const original = articles.find((article) => article.slug === summary.slug);
  if (!original) throw new Error(`Missing existing story article: ${summary.slug}`);
  return {
    ...summary,
    date: original.date,
    provenance: {
      authorType: "모스픽 기존 글",
      originalSource: `/articles/${summary.slug}`,
      publicationDate: original.date,
      reuseScope: "개발 과정 요약",
    },
  };
});
