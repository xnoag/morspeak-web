import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import VideoAutoplay from "@/components/VideoAutoplay";
import CaregiverSlideshow from "@/components/CaregiverSlideshow";
import NewsletterForm from "@/components/NewsletterForm";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Morspeak",
  description: "We help ALS patients do more on their own, one thing at a time.",
};

const APP_STORE_URL =
  "https://apps.apple.com/kr/app/%EB%AA%A8%EC%8A%A4%ED%94%BD/id6743996900";

const features = [
  {
    heading: "Speak out",
    body: "Create sentences, read them aloud, send messages,\nor make an emergency call.",
    image: "https://framerusercontent.com/images/sOdCdxICKPt8APx1KmEmPl12Qhk.png",
    alt: "Speak feature",
  },
  {
    heading: "Light up",
    body: "Control connected devices through IoT —\nwhatever you need, whenever you need it.",
    image: "https://framerusercontent.com/images/B2igMwrtw4VFsejH0NCakAgQ2k.png",
    alt: "Lighting control feature",
  },
  {
    heading: "Watch videos",
    body: "Find and enjoy the videos and music you love,\nfreely.",
    image: "https://framerusercontent.com/images/6OFLrhjW56mz6AzKPCl0DuFboA.png",
    alt: "Video playback feature",
  },
] as const;

export default function EngPage() {
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
            With a single blink,<br />
            your day begins<br className="sm:hidden" /> to move again.
          </h1>
          <p className="text-[17px] md:text-[19px]" style={{ color: "rgba(245,245,247,0.7)", letterSpacing: "-0.01em" }}>
            We help ALS patients do more on their own, one thing at a time.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-semibold px-7 py-3 rounded-full text-white hover:opacity-90 transition-opacity"
              style={{ background: "rgba(0,122,255,0.9)", letterSpacing: "-0.3px" }}
            >
              Download on App Store
            </Link>
            <Link
              href="#about"
              className="text-[15px] font-medium px-7 py-3 rounded-full hover:opacity-70 transition-opacity"
              style={{ color: "#f5f5f7", border: "1px solid rgba(245,245,247,0.3)", letterSpacing: "-0.3px" }}
            >
              Learn more
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
              Step by step, back to life.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-[19px] md:text-[21px] mb-2" style={{ color: "rgba(245,245,247,0.65)", letterSpacing: "-0.01em", lineHeight: 1.6 }}>
              Speak. Light up. Watch.
            </p>
            <p className="text-[19px] md:text-[21px]" style={{ color: "rgba(245,245,247,0.65)", letterSpacing: "-0.01em", lineHeight: 1.6 }}>
              With Morspeak.
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
              Install
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Feature headline */}
      <section className="py-24 px-6 text-center" style={{ background: "linear-gradient(180deg, #000 0%, #0a0a0a 100%)" }}>
        <FadeIn>
          <p className="text-[13px] font-medium uppercase mb-6" style={{ color: "rgba(245,245,247,0.4)", letterSpacing: "0.12em" }}>
            Features
          </p>
          <h2 className="font-black" style={{ fontSize: "clamp(40px, 7vw, 80px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f5f5f7" }}>
            With just a blink.
          </h2>
        </FadeIn>
      </section>

      {/* Features */}
      {features.map((feature, i) => (
        <section key={feature.heading} className="py-28 px-6" style={{ background: i % 2 === 0 ? "#0a0a0a" : "#000" }}>
          <div className="max-w-[1100px] mx-auto">
            <FadeIn className="text-center mb-16">
              <h3
                className="font-bold mb-5"
                style={{ fontSize: "clamp(36px, 6vw, 68px)", lineHeight: 1.1, letterSpacing: "-0.03em", color: "#f5f5f7" }}
              >
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
        heading={"Designed for patients\nand caregivers"}
        body="When help is needed, Morspeak lets you know — giving caregivers peace of mind."
      />

      <section className="py-20 px-6" style={{ background: "#111" }}>
        <div className="max-w-[1200px] mx-auto">
          <FadeIn>
            <NewsletterForm label="Get product news and updates" placeholder="you@example.com" successMessage="Thank you! We'll be in touch." />
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
