import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import VideoAutoplay from "@/components/VideoAutoplay";
import CaregiverSlideshow from "@/components/CaregiverSlideshow";
import NewsletterForm from "@/components/NewsletterForm";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "モースピーク | Morspeak",
  description: "ALS患者が一人でできることを、ひとつずつ増やしていきます。",
};

const APP_STORE_URL =
  "https://apps.apple.com/kr/app/%EB%AA%A8%EC%8A%A4%ED%94%BD/id6743996900";

const features = [
  {
    heading: "話しかけて",
    body: "文章を作って読み上げたり、メッセージを送ったり、\n緊急連絡もできます。",
    image: "https://framerusercontent.com/images/sOdCdxICKPt8APx1KmEmPl12Qhk.png",
    alt: "コミュニケーション機能",
  },
  {
    heading: "照明をつけて",
    body: "IoT機器の制御で、必要なデバイスを\nいくつでも連携して操作できます。",
    image: "https://framerusercontent.com/images/B2igMwrtw4VFsejH0NCakAgQ2k.png",
    alt: "照明制御機能",
  },
  {
    heading: "映像を見ること",
    body: "見たい映像や聴きたい音楽を\n自由に探して楽しめます。",
    image: "https://framerusercontent.com/images/6OFLrhjW56mz6AzKPCl0DuFboA.png",
    alt: "映像視聴機能",
  },
] as const;

export default function JpnPage() {
  return (
    <main style={{ background: "#000", color: "#f5f5f7" }}>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: "100svh" }}>
        <VideoAutoplay
          src="https://framerusercontent.com/assets/nsWTORI52JI6y43DeDVo5Ak5HM.mp4"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)" }}
        />
        <div className="relative z-10 flex flex-col items-center text-center px-6 gap-5">
          <p className="text-[13px] font-medium uppercase" style={{ color: "rgba(245,245,247,0.6)", letterSpacing: "0.12em" }}>
            Morspeak
          </p>
          <h1
            className="font-black"
            style={{ fontSize: "clamp(42px, 8vw, 88px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f5f5f7", maxWidth: "800px" }}
          >
            ひとまばたきで、<br />
            あなたの一日が<br className="sm:hidden" />再び動き出します。
          </h1>
          <p className="text-[17px] md:text-[19px]" style={{ color: "rgba(245,245,247,0.7)", letterSpacing: "-0.01em" }}>
            ALS患者が一人でできることを、ひとつずつ増やしていきます。
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-semibold px-7 py-3 rounded-full text-white hover:opacity-90 transition-opacity"
              style={{ background: "rgba(0,122,255,0.9)", letterSpacing: "-0.3px" }}
            >
              App Storeでインストール
            </Link>
            <Link
              href="#about"
              className="text-[15px] font-medium px-7 py-3 rounded-full hover:opacity-70 transition-opacity"
              style={{ color: "#f5f5f7", border: "1px solid rgba(245,245,247,0.3)", letterSpacing: "-0.3px" }}
            >
              詳しく見る
            </Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-[11px]" style={{ color: "rgba(245,245,247,0.4)", letterSpacing: "0.1em" }}>SCROLL</span>
          <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, rgba(245,245,247,0.4), transparent)" }} />
        </div>
      </section>

      {/* Sub-hero */}
      <section id="about" className="py-32 px-6" style={{ background: "#000" }}>
        <div className="max-w-[800px] mx-auto text-center">
          <FadeIn>
            <h2 className="font-bold mb-6" style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.15, letterSpacing: "-0.03em", color: "#f5f5f7" }}>
              ひとつずつ、日常へ。
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-[19px] md:text-[21px] mb-2" style={{ color: "rgba(245,245,247,0.65)", letterSpacing: "-0.01em", lineHeight: 1.6 }}>
              話す、照明をつける、映像を見る。
            </p>
            <p className="text-[19px] md:text-[21px]" style={{ color: "rgba(245,245,247,0.65)", letterSpacing: "-0.01em", lineHeight: 1.6 }}>
              モースピークと一緒に、少しずつ取り戻していきましょう。
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mt-10 text-[15px] font-semibold px-7 py-3 rounded-full text-white hover:opacity-90 transition-opacity"
              style={{ background: "rgba(0,122,255,0.9)", letterSpacing: "-0.3px" }}
            >
              インストール
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Feature headline */}
      <section className="py-24 px-6 text-center" style={{ background: "linear-gradient(180deg, #000 0%, #0a0a0a 100%)" }}>
        <FadeIn>
          <p className="text-[13px] font-medium uppercase mb-6" style={{ color: "rgba(245,245,247,0.4)", letterSpacing: "0.12em" }}>
            機能
          </p>
          <h2 className="font-black" style={{ fontSize: "clamp(40px, 7vw, 80px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f5f5f7" }}>
            まばたきだけで
          </h2>
        </FadeIn>
      </section>

      {/* Features */}
      {features.map((feature, i) => (
        <section key={feature.heading} className="py-28 px-6" style={{ background: i % 2 === 0 ? "#0a0a0a" : "#000" }}>
          <div className="max-w-[1100px] mx-auto">
            <FadeIn className="text-center mb-16">
              <h3 className="font-bold mb-5" style={{ fontSize: "clamp(36px, 6vw, 68px)", lineHeight: 1.1, letterSpacing: "-0.03em", color: "#f5f5f7" }}>
                {feature.heading}
              </h3>
              <p className="text-[18px] md:text-[21px] whitespace-pre-line" style={{ color: "rgba(245,245,247,0.6)", letterSpacing: "-0.01em", lineHeight: 1.6 }}>
                {feature.body}
              </p>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="overflow-hidden rounded-2xl" style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
                <Image src={feature.image} alt={feature.alt} width={1100} height={625} className="w-full" />
              </div>
            </FadeIn>
          </div>
        </section>
      ))}

      <CaregiverSlideshow
        heading={"患者さんとご家族\nのために"}
        body="呼び出しはモースピークがお知らせします。その間、介護者はご自身の時間をゆっくりお過ごしください。"
      />

      <section className="py-20 px-6" style={{ background: "#111" }}>
        <div className="max-w-[1200px] mx-auto">
          <FadeIn>
            <NewsletterForm label="製品の最新情報とアップデートを受け取る" placeholder="you@example.com" successMessage="ありがとうございます！" />
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
