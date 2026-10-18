"use client";

/* Preserve the established brand visuals while connecting the corporate story. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { pc, mobile } from "./assets";
import Link from "next/link";
import styles from "./renewal.module.css";

const heroSlides = [
  {
    src: "/renewal-reference/hero-bedside-man-2026.webp",
    small: "/renewal-reference/hero-1M.webp",
    alt: "침대에 누워 거치된 태블릿을 바라보는 사람",
  },
  {
    src: "/renewal-reference/hero-riverside-walk-2026.webp",
    small: "/renewal-reference/hero-2M.webp",
    alt: "해 질 무렵 강변에 함께 있는 휠체어 사용자와 동행인",
  },
  {
    src: "/renewal-reference/hero-calm-morning-2026.webp",
    small: "/renewal-reference/hero-3M.webp",
    alt: "아침에 거치된 태블릿을 바라보는 사람",
  },
];

// Keep the subtle push-in and dissolve continuous, including the last-to-first transition.
const HERO_STEP_MS = 3500;
const HERO_ZOOM_MS = 4000;
const HERO_FADE_MS = 350;
const HERO_CYCLE_MS = heroSlides.length * HERO_STEP_MS;

function HeroSlideshow({ controlRight, controlBottom }: {
  controlRight: MotionValue<string>;
  controlBottom: MotionValue<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.2 });
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const elapsedRef = useRef(0);
  const playing = !reducedMotion && !paused && visible && pageVisible;

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous: number | undefined;
    const slides = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-slide]") ?? []);
    const tick = (now: number) => {
      const images = ref.current?.querySelectorAll<HTMLImageElement>("img");
      const ready = images && Array.from(images).every(image => image.complete && image.naturalWidth > 0);
      if (ready && previous !== undefined) {
        const oldActive = Math.floor(elapsedRef.current / HERO_STEP_MS);
        elapsedRef.current = (elapsedRef.current + Math.min(now - previous, 100)) % HERO_CYCLE_MS;
        const current = Math.floor(elapsedRef.current / HERO_STEP_MS);
        const next = (current + 1) % heroSlides.length;
        const stepElapsed = elapsedRef.current % HERO_STEP_MS;
        const fade = Math.max(0, Math.min(1, (stepElapsed - HERO_STEP_MS + HERO_FADE_MS) / HERO_FADE_MS));
        // Animate only compositor properties; React updates once per photo, not every frame.
        slides.forEach((slide, index) => {
          const age = index === current ? stepElapsed + HERO_FADE_MS : index === next ? Math.max(0, stepElapsed - HERO_STEP_MS + HERO_FADE_MS) : 0;
          const progress = Math.min(1, age / HERO_ZOOM_MS);
          slide.style.opacity = String(index === current ? 1 : index === next ? fade : 0);
          slide.style.zIndex = String(index === next ? 2 : index === current ? 1 : 0);
          (slide.firstElementChild as HTMLElement).style.transform = `scale(${1 + 0.05 * (1 - (1 - progress) ** 2)})`;
        });
        if (current !== oldActive) setActive(current);
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <div ref={ref} className={styles.heroSlideshow}>
      {heroSlides.map((slide, index) => {
        return (
          <div
            key={slide.src}
            className={styles.heroSlide}
            data-slide={index}
            aria-hidden={index !== active}
            style={{ opacity: index === 0 ? 1 : 0 }}
          >
            <div className={styles.heroZoom}>
                <Picture
                  {...slide}
                  className={styles.heroSlideImage}
                  fetchPriority={index === 0 ? "high" : "low"}
                  loading="eager"
                />
            </div>
          </div>
        );
      })}
      {!reducedMotion && (
        <motion.button
          type="button"
          className={styles.heroPause}
          style={{ right: controlRight, bottom: controlBottom }}
          onClick={() => setPaused(value => !value)}
          aria-label={paused ? "사진 자동 전환 재생" : "사진 자동 전환 일시정지"}
          aria-pressed={paused}
        >
          <svg viewBox="0 0 36 36" aria-hidden="true">
            {paused ? (
              <path d="M14 12.5a1 1 0 0 1 1.5-.86l9 5.5a1 1 0 0 1 0 1.72l-9 5.5A1 1 0 0 1 14 23.5Z" />
            ) : (
              <><rect x="12.5" y="11.5" width="4" height="13" rx="1.3" /><rect x="19.5" y="11.5" width="4" height="13" rx="1.3" /></>
            )}
          </svg>
        </motion.button>
      )}
    </div>
  );
}

type Feature = {
  title: string;
  body: string;
  image?: string;
  small?: string;
  alt?: string;
  bg: string;
  light: boolean;
};

const features: Feature[] = [
  {
    title: "의사소통",
    body: "작은 움직임에서 대화를 시작합니다.",
    image: "/renewal-reference/morspeak-bedside-group-3.webp",
    small: "/renewal-reference/morspeak-bedside-group-3.webp",
    alt: "거치된 태블릿으로 의사소통하는 장면을 표현한 이미지",
    bg: "#f5f5f7",
    light: false,
  },
  {
    title: "생활 환경 제어",
    body: "필요한 조명을 직접 선택하는 일상.",
    image: "/renewal-reference/morspeak-light-control-illustration-v3.webp",
    small: "/renewal-reference/morspeak-light-control-illustration-v3.webp",
    alt: "태블릿으로 조명을 제어하는 장면을 표현한 일러스트",
    bg: "#fde7d3",
    light: false,
  },
  {
    title: "도움 요청",
    body: "도움이 필요할 때 의사를 전합니다.",
    image: "/renewal-reference/morspeak-sos-home-illustration-v2.webp",
    alt: "집에서 도움을 요청하는 장면을 표현한 일러스트",
    bg: "#673627",
    light: true,
  },
  {
    title: "연결",
    body: "한 번의 메시지에서 다시 이어지는 관계.",
    image: "/renewal-reference/morspeak-connection-illustration-v2.webp",
    alt: "메시지와 영상으로 가족과 연결되는 장면을 표현한 일러스트",
    bg: "#ff4800",
    light: false,
  },
  {
    title: "여가",
    body: "음악과 영상을 스스로 고르는 시간.",
    image: "/renewal-reference/morspeak-music-control-illustration.webp",
    alt: "태블릿으로 음악을 고르는 장면을 표현한 일러스트",
    bg: "#cccccc",
    light: false,
  },
  {
    title: "가능성",
    body: "다음 선택을 함께 찾아갑니다.",
    image: "/renewal-reference/morspeak-possibilities-illustration.webp",
    alt: "대화와 여가 등 일상의 가능성을 표현한 일러스트",
    bg: "#fde7d3",
    light: false,
  },
];
type InputKind = "blink" | "mouth" | "frown" | "finger" | "breath" | "personalize";

const resources: { title: string; body: string; icon: InputKind }[] = [
  { title: "눈 깜빡임", body: "눈 깜빡임을 입력으로 활용할 수 있습니다.", icon: "blink" },
  { title: "입 움직임", body: "입을 움직여 화면을 조작하는 방식을 살펴봅니다.", icon: "mouth" },
  { title: "얼굴 움직임", body: "작은 얼굴 움직임도 평가 대상입니다.", icon: "frown" },
  { title: "손가락 움직임", body: "손가락의 작은 움직임을 입력으로 활용합니다.", icon: "finger" },
  { title: "호흡", body: "숨을 불어 입력하는 방식을 살펴봅니다.", icon: "breath" },
  { title: "나에게 맞는 방식", body: "가능한 움직임과 반복 가능성은 개별적으로 확인합니다.", icon: "personalize" },
];

function InputSymbol({ kind }: { kind: InputKind }) {
  const paths: Record<InputKind, ReactNode> = {
    blink: <g className={styles.symbolBlink}>
      <ellipse cx="17" cy="28" rx="9" ry="18" />
      <ellipse cx="39" cy="28" rx="9" ry="18" />
      <ellipse cx="14" cy="33" rx="4.5" ry="6" fill="currentColor" stroke="none" />
      <ellipse cx="36" cy="33" rx="4.5" ry="6" fill="currentColor" stroke="none" />
    </g>,
    mouth: <>
      <g className={styles.symbolMouthClosed}>
        <path d="M13 23h30" strokeWidth="5" />
        <path d="M23 40c3 2 7 2 10 0" strokeWidth="4" />
      </g>
      <g className={styles.symbolMouthOpen}>
        <ellipse cx="28" cy="27" rx="14" ry="13" fill="currentColor" stroke="none" />
        <ellipse cx="28" cy="32" rx="9" ry="5" fill="var(--surface)" stroke="none" />
        <path d="M23 47c3 2 7 2 10 0" strokeWidth="4" />
      </g>
    </>,
    frown: <>
      <g className={styles.symbolFrownRelaxed}>
        <path d="M10 22c5-4 10-4 15 0m6 0c5-4 10-4 15 0" />
      </g>
      <g className={styles.symbolFrownBrows}>
        <path d="M9 19c7-1 12 1 16 6m22-6c-7-1-12 1-16 6" />
        <path d="m25 14-2-5m8 5 2-5" />
      </g>
      <circle cx="20" cy="32" r="2" fill="currentColor" stroke="none" />
      <circle cx="36" cy="32" r="2" fill="currentColor" stroke="none" />
      <path d="M18 47c2-5 6-7 10-7s8 2 10 7" />
    </>,
    finger: <>
      <g className={styles.symbolFinger}>
        <path d="M14 48l-5-8a4 4 0 0 1 6-5l6 5V15a4 4 0 0 1 8 0v17l3-2a4 4 0 0 1 6 2 4 4 0 0 1 7 4l-2 12H14Z" />
      </g>
      <g className={styles.symbolTapLines}>
        <path d="M17 11c2-4 5-6 8-6s6 2 8 6m5 4 3-3m-3 10h5" />
      </g>
    </>,
    breath: <>
      <path d="M9 11c8 1 13 7 13 16 0 7-3 13-8 17M8 34c5-1 9-1 14 1" />
      <g className={styles.symbolBreath}>
        <path d="M26 21c5-4 10-4 15-1M26 29c8-2 15-1 21 2M27 37c5-1 9 0 13 3" />
      </g>
    </>,
    personalize: <>
      <path d="M8 15h40M8 28h40M8 41h40" />
      <circle className={styles.symbolSliderOne} cx="20" cy="15" r="4" fill="var(--surface)" />
      <circle className={styles.symbolSliderTwo} cx="36" cy="28" r="4" fill="var(--surface)" />
      <circle className={styles.symbolSliderThree} cx="25" cy="41" r="4" fill="var(--surface)" />
    </>,
  };

  return <svg className={styles.resourceIcon} viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
const stories = [
  {
    source: "모스픽 소식",
    title: "Apple CEO Tim Cook에게 모스픽을 소개했습니다",
    image: "/renewal-reference/morspeak-tim-cook-meeting.jpg",
    small: "/renewal-reference/morspeak-tim-cook-meeting.jpg",
    alt: "WWDC에서 모스픽을 소개하는 한가온 대표",
    href: "/articles/250609",
    external: false,
  },
  {
    source: "스마일게이트 뉴스룸",
    title: "기술을 통한 사회적 변화에 관한 인터뷰",
    image: "/renewal-reference/morspeak-everyday-story-20261008.webp",
    small: "/renewal-reference/morspeak-everyday-story-20261008.webp",
    alt: "침대 옆에서 모스픽을 설명하는 장면",
    href: "https://newsroom.smilegate.com/en/lab/morspeak_interview",
    external: true,
  },
];
const onboardingSteps = [
  {
    number: "01",
    title: "잔존 움직임 평가",
    body: "모스픽 테스트 프로그램으로 남아 있는 움직임과 반복 가능성을 살펴봅니다.",
  },
  {
    number: "02",
    title: "결과 검토",
    body: "테스트 결과를 검토해 모스픽 사용 가능성과 적합한 입력 방식을 안내합니다.",
  },
  {
    number: "03",
    title: "세팅 안내",
    body: "사용 공간에 필요한 기기와 배치·설정을 안내합니다.",
  },
  {
    number: "04",
    title: "교육 지원",
    body: "모스픽을 익히고 사용할 수 있도록 필요한 교육과 세팅을 지원합니다.",
  },
  {
    number: "05",
    title: "커뮤니티",
    body: "이용자 커뮤니티에서 새로운 소식을 접하고 사용 경험을 나눕니다.",
  },
];

function Picture({
  src,
  small,
  alt = "",
  className,
  fetchPriority = "auto",
  loading = "lazy",
}: {
  src: string;
  small?: string;
  alt?: string;
  className?: string;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
}) {
  return (
    <picture className={className}>
      {small && <source media="(max-width: 734px)" srcSet={small} />}
      <img src={src} alt={alt} fetchPriority={fetchPriority} loading={loading} decoding="async" />
    </picture>
  );
}

function Gallery({
  children,
  label,
  wide = false,
}: {
  children: ReactNode;
  label: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  function update() {
    const el = ref.current;
    if (el)
      setEdges({
        start: el.scrollLeft < 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
  }
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);
  function move(direction: number) {
    const el = ref.current;
    const card = el?.firstElementChild;
    if (el && card)
      el.scrollBy({
        left: direction * (card.getBoundingClientRect().width + 20),
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  return (
    <div className={wide ? styles.wideGallery : undefined}>
      <div
        ref={ref}
        className={styles.gallery}
        onScroll={update}
        aria-label={label}
      >
        {children}
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          aria-label={`${label}: previous`}
          disabled={edges.start}
          onClick={() => move(-1)}
        >
          <img src={pc.imgOriginalSvg2} alt="" />
        </button>
        <button
          type="button"
          aria-label={`${label}: next`}
          disabled={edges.end}
          onClick={() => move(1)}
        >
          <img src={pc.imgOriginalSvg3} alt="" />
        </button>
      </div>
    </div>
  );
}

const introduction =
  "모스픽은 움직임이 제한된 사람도 자신의 의사를 전하고 일상의 선택을 이어갈 수 있도록 돕는 보조 기술을 만듭니다. 사람마다 남아 있는 움직임이 다르기에, 입력 방식도 함께 살펴봅니다.";

function Hero() {
  const scene = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const scrollYProgress = useTransform(scrollY, () => {
    const element = scene.current;
    const panel = element?.firstElementChild;
    if (!element || !panel) return 0;
    // Finish the transition after half a screen, then hold the introduction
    // for another 35% of a screen before the sticky panel leaves the viewport.
    const distance = panel.clientHeight * 0.5;
    return Math.max(
      0,
      Math.min(1, -element.getBoundingClientRect().top / Math.max(1, distance)),
    );
  });
  const titleOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const introOpacity = useTransform(scrollYProgress, [0.5, 1], [0, 1]);
  // Center the finished frame in the viewport below the fixed navigation.
  const clipPath = useTransform(scrollYProgress, (progress) =>
    `inset(calc(${progress * 10}% + var(--nav-height) * ${progress * 0.9}) ${progress * 6.25}% calc(${progress * 10}% - var(--nav-height) * ${progress * 0.1}) round ${progress * 40}px)`,
  );
  const introPosition = useTransform(
    scrollYProgress,
    (progress) => `translateY(calc(var(--nav-height) * ${progress * 0.5}))`,
  );
  // The visible 36px icon sits 24px inside the image; the hit target adds 4px.
  const controlRight = useTransform(scrollYProgress, progress =>
    `calc(20px + ${progress * 6.25}%)`,
  );
  const controlBottom = useTransform(scrollYProgress, progress =>
    `calc(20px + ${progress * 10}% - var(--nav-height) * ${progress * 0.1})`,
  );
  return (
    <section
      ref={scene}
      className={`${styles.heroSequence} ${reducedMotion ? styles.reducedScene : ""}`}
      id="renewal-overview"
    >
      <motion.div
        className={styles.hero}
        style={reducedMotion ? undefined : { clipPath }}
      >
        <HeroSlideshow controlRight={controlRight} controlBottom={controlBottom} />
        <motion.div
          className={styles.heroCopy}
          style={reducedMotion ? undefined : { opacity: titleOpacity }}
        >
          <h1>
            <svg className={styles.heroWordLines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.heroWordLinesDesktop} d="M27 61 46 74 M54 73 72 27" />
              <path className={styles.heroWordLinesMobile} d="M29 57 41 73 M58 73 68 27" />
            </svg>
            <span className={styles.heroWordSmall}>Small,</span>{" "}
            <span className={styles.heroWordYet}>Yet</span>{" "}
            <span className={styles.heroWordSignificant}>Significant</span>
          </h1>
        </motion.div>
        {!reducedMotion && (
          <motion.div
            className={styles.heroIntro}
            style={{ opacity: introOpacity, transform: introPosition }}
          >
            <p>{introduction}</p>
          </motion.div>
        )}
      </motion.div>
      {reducedMotion && (
        <div className={styles.intro}>
          <p>{introduction}</p>
        </div>
      )}
    </section>
  );
}

export default function Renewal() {
  const [menu, setMenu] = useState(false);
  return (
    <main className={styles.page} lang="ko">
      <a href="#renewal-about" className={styles.skip}>
        본문으로 건너뛰기
      </a>
      <header className={styles.nav}>
        <a
          href="#renewal-overview"
          aria-label="모스픽 소개 처음으로"
        >
          <Picture
            src={pc.imgMorspeakLogoWhiteOriginalRgbVectors}
            small={mobile.imgMorspeakLogoWhiteOriginalRgbVectors}
            alt="Morspeak"
          />
        </a>
        <nav
          className={styles.desktopNav}
          aria-label="주요 메뉴"
        >
          <a href="#renewal-about">모스픽 소개</a>
          <a href="#renewal-features">솔루션</a>
          <a href="#renewal-impact">일상의 변화</a>
          <a href="#renewal-use">이용 안내</a>
          <a href="#renewal-partner">협업</a>
          <a href="#renewal-journal">이야기</a>
          <a href="#renewal-press">언론</a>
        </nav>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={menu ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menu}
          aria-controls="renewal-menu"
          onClick={() => setMenu(!menu)}
        >
          <img src={mobile.imgOriginalSvg9} alt="" />
        </button>
      </header>
      {menu && (
        <nav
          id="renewal-menu"
          className={styles.mobileNav}
          aria-label="모바일 주요 메뉴"
        >
          {[
            ["renewal-about", "모스픽 소개"], ["renewal-features", "솔루션"],
            ["renewal-impact", "일상의 변화"], ["renewal-use", "이용 안내"],
            ["renewal-partner", "협업"], ["renewal-journal", "이야기"],
            ["renewal-press", "언론"],
          ].map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>{label}</a>)}
        </nav>
      )}
      <Hero />
      <section className={styles.editorial} id="renewal-about">
        <div className={styles.editorialInner}>
          <p className={styles.eyebrow}>모스픽 소개</p>
          <h2>작은 움직임도<br />나의 말과 선택이 되도록.</h2>
          <p className={styles.lead}>모스픽은 루게릭병을 비롯해 움직임이 제한된 사람을 위한 보조 기술을 만드는 팀입니다. 말하고 싶을 때 말하고, 필요한 일을 직접 선택할 수 있는 일상을 지향합니다.</p>
          <p>누군가의 도움을 기다려야만 의사를 전할 수 있는 순간을 줄이고 싶습니다. 사람마다 남아 있는 움직임과 사용하는 환경이 다른 만큼, 한 가지 조작법을 모두에게 적용하지 않고 개인에게 맞는 방식을 찾습니다.</p>
          <Link className={styles.textLink} href="/waitlist">내게 맞는 이용 방법 문의하기 →</Link>
        </div>
      </section>
      <section className={styles.features} id="renewal-features">
        <div className={styles.featureHeading}>
          <p className={styles.eyebrow}>솔루션</p>
          <h2>작은 움직임을 입력으로,<br />일상의 선택을 내 뜻대로.</h2>
          <p className={styles.sectionLead}>모스픽은 작은 움직임을 짧고 긴 신호로 구분하고, 그 조합을 글자와 명령으로 바꾸는 iPad 앱입니다. 눈 깜빡임 같은 움직임으로 말을 전하고, 음악이나 조명처럼 일상의 기능을 선택할 수 있도록 돕습니다.</p>
        </div>
        <Gallery label="모스픽 솔루션">
          {features.map((card) => (
            <article
              className={`${styles.featureCard} ${card.light ? styles.light : ""}`}
              style={{ background: card.bg }}
              key={card.title}
            >
              {card.image && (
                <Picture
                  src={card.image}
                  small={card.small}
                  className={`${styles.featureImage} ${styles.featureArtwork}`}
                  alt={card.alt}
                />
              )}
              <div className={styles.featureCopy}>
                <p>{card.title}</p>
                <h3>{card.body}</h3>
              </div>
            </article>
          ))}
        </Gallery>
      </section>
      <section className={styles.impact} id="renewal-impact">
        <div className={styles.impactInner}>
          <div>
            <p className={styles.eyebrow}>일상의 변화와 임팩트</p>
            <h2>변화는 스스로 선택할 수 있는 순간에서 시작합니다.</h2>
          </div>
          <div className={styles.impactCopy}>
            <p>원하는 말을 전하고, 조명을 조절하거나 음악을 고르는 일. 모스픽은 작은 움직임이 이런 선택으로 이어지도록 설계합니다.</p>
            <p>내 뜻을 전할 수 있는 통로가 생기는 것. 필요한 것을 직접 고를 수 있는 시간이 늘어나는 것. 모스픽이 만들고 싶은 변화는 당사자와 가족의 이런 일상에 있습니다.</p>
            <p>2026년 7월 스마일게이트 뉴스룸은 모스픽을 통해 필요한 것을 요청하고 음악을 직접 고른 한 가족의 경험을 소개했습니다. 그 가족의 이야기를 인터뷰에서 만나 보세요.</p>
            <a className={styles.textLink} href="https://newsroom.smilegate.com/en/lab/morspeak_interview" target="_blank" rel="noreferrer">스마일게이트 뉴스룸 인터뷰 원문 읽기 →</a>
            <Link className={styles.textLink} href="#renewal-journal">만들어 가는 과정 읽기 →</Link>
          </div>
        </div>
      </section>
      <section className={styles.resources}>
        <h2>
          사람마다 다른 움직임,<br />함께 찾는 입력 방식.
        </h2>
        <p className={styles.resourceIntro}>아래는 살펴볼 수 있는 움직임의 예시입니다. 실제 지원 방식과 적합성은 평가 결과와 사용 환경에 따라 달라집니다.</p>
        <Gallery label="모스픽 입력 방식">
          {resources.map((card) => (
            <article
              className={styles.resourceCard}
              key={card.title}
            >
              <InputSymbol kind={card.icon} />
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </Gallery>
      </section>
      <section className={styles.values} id="renewal-use">
        <p className={styles.valuesEyebrow}>개인·가족 이용 안내</p>
        <h2>나에게 맞는 모스픽, 함께 확인합니다.</h2>
        <p className={styles.valuesIntro}>본인이나 가족이 이용을 검토할 때, 남아 있는 움직임과 사용 환경을 다음 다섯 단계로 살펴봅니다.</p>
        <Gallery label="개인 이용 가능성 확인 다섯 단계">
          {onboardingSteps.map((card) => (
            <article className={styles.valueCard} key={card.title} aria-label={`${Number(card.number)}단계: ${card.title}`}>
              <div className={styles.valueIcon}>
                <span className={styles.stepNumber} aria-hidden="true">{card.number}</span>
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </Gallery>
        <div className={styles.sectionAction}>
          <p>평가 장소·기기·비용과 지원 범위는 이용 안내 과정에서 확인할 수 있습니다.</p>
          <Link className={styles.pillLink} href="/waitlist">모스픽 이용 안내 신청</Link>
        </div>
      </section>
      <section className={styles.editorial} id="renewal-partner">
        <div className={styles.editorialInner}>
          <p className={styles.eyebrow}>기관·기업 협업</p>
          <h2>더 많은 선택의 기회를<br />함께 만들어 갑니다.</h2>
          <p className={styles.lead}>사람을 연결하는 현장 경험, 기술을 만드는 전문성, 지속적인 사용을 돕는 자원. 서로의 역할을 모아 모스픽과 함께할 방법을 찾습니다.</p>
          <div className={styles.partnerPaths}>
            <article><h3>현장에서 함께</h3><p>협회·의료·돌봄 기관에서 모스픽이 필요한 사람을 만나고, 도입과 교육을 논의합니다.</p></article>
            <article><h3>기술로 함께</h3><p>접근성 기술과 제품을 만드는 기업의 전문성을 바탕으로 협력 가능성을 살펴봅니다.</p></article>
            <article><h3>지속적인 사용을 위해</h3><p>사용 환경 마련과 교육·지원에 힘을 보태고 싶은 조직의 제안을 기다립니다.</p></article>
          </div>
          <p>조직의 역할과 함께 풀고 싶은 문제를 알려 주세요. 문의 내용을 바탕으로 협력 방향과 범위를 논의합니다.</p>
          <Link className={styles.pillLink} href="/contact">협업 문의하기</Link>
        </div>
      </section>
      <section className={styles.journal} id="renewal-journal">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>모스픽 이야기</p>
          <h2>문제를 듣고, 만들고,<br />다시 살펴보는 과정.</h2>
          <p className={styles.sectionLead}>현장에서 무엇을 배우고 제품을 어떻게 다듬어 왔는지, 모스픽이 직접 기록한 이야기를 읽어 보세요.</p>
        </div>
        <div className={styles.journalGrid}>
          <Link href="/home/renewal/stories/250708" className={styles.journalCard}>
            <span>현장과 제품</span><h3>국내부터 시작하는 해결 사례</h3>
            <p>직접 만나 사용 과정을 살피고, 피드백을 제품에 반영해 온 이야기.</p><strong>이야기 읽기 →</strong>
          </Link>
          <Link href="/home/renewal/stories/251124" className={styles.journalCard}>
            <span>만드는 사람들</span><h3>Let’Swift에서 전한 모스픽의 여정</h3>
            <p>모스픽을 만들게 된 계기와 입력 기술을 개발해 온 과정.</p><strong>이야기 읽기 →</strong>
          </Link>
        </div>
        <Link className={styles.textLink} href="/home/renewal/stories">모든 이야기 보기 →</Link>
      </section>
      <section className={styles.stories} id="renewal-press">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>언론과 소식</p>
          <h2>모스픽을 소개한 자리와 보도.</h2>
          <p className={styles.sectionLead}>모스픽을 세상에 소개한 순간과, 기술이 만드는 변화를 전한 인터뷰를 모았습니다.</p>
        </div>
        <Gallery label="모스픽 언론 및 소식" wide>
          {stories.map((card) => (
            <article className={styles.storyCard} key={card.title}>
              <Picture className={styles.storyImage} src={card.image} small={card.small} alt={card.alt ?? card.title} />
              <div className={styles.scrim} />
              <div className={styles.storyCopy}>
                <p className={styles.storySource}>{card.source}</p>
                <h3>{card.title}</h3>
                <a href={card.href} target={card.external ? "_blank" : undefined} rel={card.external ? "noreferrer" : undefined}>기사 읽기 →</a>
              </div>
            </article>
          ))}
        </Gallery>
      </section>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div><strong>Morspeak</strong><p>Small, Yet Significant.</p></div>
          <nav aria-label="하단 메뉴">
            <Link href="/waitlist">이용 안내 신청</Link>
            <Link href="/contact">협업 문의</Link>
            <a href="mailto:hello@morspeak.com">hello@morspeak.com</a>
            <Link href="/legalpolicies">개인정보 및 이용 안내</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
