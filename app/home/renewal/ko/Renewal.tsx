"use client";

/* Korean translation of production commit 9317b69835c4; preserve its layout and motion. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { pc, mobile } from "../assets";
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
    body: "작은 움직임에서\n대화가 시작됩니다.",
    image: "/renewal-reference/morspeak-bedside-group-3.webp",
    small: "/renewal-reference/morspeak-bedside-group-3.webp",
    alt: "거치된 태블릿으로 의사소통하는 장면을 표현한 이미지",
    bg: "#f5f5f7",
    light: false,
  },
  {
    title: "생활 환경 제어",
    body: "불을 켜고 싶을 때,\n내 뜻대로.",
    image: "/renewal-reference/morspeak-light-control-illustration-v3.webp",
    small: "/renewal-reference/morspeak-light-control-illustration-v3.webp",
    alt: "태블릿으로 조명을 제어하는 장면을 표현한 일러스트",
    bg: "#fde7d3",
    light: false,
  },
  {
    title: "도움 요청",
    body: "필요한 순간에 도움을,\n돌보는 일상에 여유를.",
    image: "/renewal-reference/morspeak-sos-home-illustration-v2.webp",
    alt: "집에서 도움을 요청하는 장면을 표현한 일러스트",
    bg: "#673627",
    light: true,
  },
  {
    title: "연결",
    body: "메시지 하나에서\n다시 이어지는 관계.",
    image: "/renewal-reference/morspeak-connection-illustration-v2.webp",
    alt: "메시지와 영상으로 가족과 연결되는 장면을 표현한 일러스트",
    bg: "#ff4800",
    light: false,
  },
  {
    title: "여가",
    body: "음악도, 영상도.\n선택은 내 뜻대로.",
    image: "/renewal-reference/morspeak-music-control-illustration.webp",
    alt: "태블릿으로 음악을 고르는 장면을 표현한 일러스트",
    bg: "#cccccc",
    light: false,
  },
  {
    title: "가능성",
    body: "다음 가능성을 상상해요.\n모스픽이 함께합니다.",
    image: "/renewal-reference/morspeak-possibilities-illustration.webp",
    alt: "대화와 음악, 영상 등 일상의 가능성을 표현한 일러스트",
    bg: "#fde7d3",
    light: false,
  },
];
type InputKind = "blink" | "mouth" | "frown" | "finger" | "breath" | "personalize";

const resources: { title: string; body: string; icon: InputKind }[] = [
  { title: "눈 깜빡임", body: "눈 깜빡임을 입력으로 활용해\n다음 선택으로 이어갑니다.", icon: "blink" },
  { title: "입 움직임", body: "손으로 터치하는 대신\n입 움직임으로 조작합니다.", icon: "mouth" },
  { title: "얼굴 움직임", body: "작은 얼굴 움직임을\n사용할 수 있는 입력으로.", icon: "frown" },
  { title: "손가락 움직임", body: "손가락의 작은 움직임도\n다음 선택을 위한 입력으로.", icon: "finger" },
  { title: "호흡", body: "숨을 불어 입력하고\n앱에서 다음 단계를 선택합니다.", icon: "breath" },
  { title: "나에게 맞는 방식", body: "사람마다 다른 움직임,\n나에게 맞는 방식을 찾습니다.", icon: "personalize" },
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
    title: "WWDC에서 Apple CEO Tim Cook에게\n모스픽을 소개했습니다.",
    image: "/renewal-reference/morspeak-tim-cook-meeting.jpg",
    small: "/renewal-reference/morspeak-tim-cook-meeting.jpg",
    alt: "WWDC에서 Apple CEO Tim Cook에게 모스픽을 소개하는 장면",
    href: "/articles/250609",
    external: false,
  },
  {
    source: "스마일게이트 뉴스룸",
    title: "기술을 통해 일상의 변화를 만드는\n모스픽의 이야기",
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
    title: "잔존 움직임 테스트",
    body: "모스픽 테스트 프로그램으로 남아 있는 움직임과 반복 가능성을 살펴봅니다.",
  },
  {
    number: "02",
    title: "사용 가능성 확인",
    body: "테스트 결과를 검토해 모스픽 사용 가능 여부와 적합한 입력 방식을 안내합니다.",
  },
  {
    number: "03",
    title: "도입과 세팅 안내",
    body: "모스픽을 도입하는 데 필요한 기기와 사용 공간의 세팅을 안내합니다.",
  },
  {
    number: "04",
    title: "교육과 사용 지원",
    body: "모스픽을 익히고 사용할 수 있도록 필요한 교육과 세팅을 지원합니다.",
  },
  {
    number: "05",
    title: "이용자 커뮤니티",
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
          aria-label={`${label}: 이전`}
          disabled={edges.start}
          onClick={() => move(-1)}
        >
          <img src={pc.imgOriginalSvg2} alt="" />
        </button>
        <button
          type="button"
          aria-label={`${label}: 다음`}
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
  "모스픽은 움직임이 제한된 사람을 위한 보조 기술을 만듭니다. 작은 움직임에서 새로운 가능성을 발견합니다. 누구나 각자의 방식으로 세상과 연결될 수 있도록. 하나의 방식에 갇히지 않고, 기술을 각자의 방식에 맞춥니다.";

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
  const [active, setActive] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (active === null) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [active]);
  function openFeature(index: number, button: HTMLButtonElement) {
    trigger.current = button;
    setActive(index);
    dialog.current?.showModal();
  }
  function closeFeature() {
    dialog.current?.close();
  }
  function onDialogClose() {
    trigger.current?.focus();
    setActive(null);
  }
  return (
    <main className={styles.page} lang="ko">
      <a href="#renewal-features" className={styles.skip}>
        본문으로 건너뛰기
      </a>
      <header className={styles.nav}>
        <a
          href="#renewal-overview"
          aria-label="모스픽 홈페이지"
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
          <a href="#renewal-overview">모스픽 소개</a>
          <a href="#renewal-features">솔루션</a>
        </nav>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="메뉴 열기"
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
          <a href="#renewal-overview" onClick={() => setMenu(false)}>
            모스픽 소개
          </a>
          <a href="#renewal-features" onClick={() => setMenu(false)}>
            솔루션
          </a>
        </nav>
      )}
      <Hero />
      <section className={styles.features} id="renewal-features">
        <div className={styles.featureHeading}>
          <h2>
            유연한 솔루션으로
            <br />
            삶의 가능성을 확장합니다.
          </h2>
        </div>
        <Gallery label="모스픽 솔루션">
          {features.map((card, i) => (
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
              <button
                type="button"
                className={styles.plus}
                aria-label={`${card.title} 자세히 보기`}
                onClick={(e) => openFeature(i, e.currentTarget)}
              >
                <img
                  src={i === 2 ? pc.imgOriginalSvg1 : pc.imgOriginalSvg}
                  alt=""
                />
              </button>
            </article>
          ))}
        </Gallery>
      </section>
      <section className={styles.resources}>
        <h2>
          나의 작은 움직임.
          <br />
          나에게 맞는 모스픽 사용 방식.
        </h2>
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
      <section className={styles.stories}>
        <h2>
          <span>모스픽이 만들어 가는</span>
          <span>
            일상의 변화를
            <br className={styles.storyMobileBreak} />
            {" "}만나보세요.
          </span>
        </h2>
        <Gallery label="모스픽 이야기" wide>
          {stories.map((card) => (
            <article className={styles.storyCard} key={card.title}>
              <Picture
                className={styles.storyImage}
                src={card.image}
                small={card.small}
                alt={card.alt ?? card.title}
              />
              <div className={styles.scrim} />
              <div className={styles.storyCopy}>
                <p className={styles.storySource}>{card.source}</p>
                <h3>{card.title}</h3>
                <a href={card.href} target={card.external ? "_blank" : undefined} rel={card.external ? "noreferrer" : undefined}>
                  이야기 읽기
                </a>
              </div>
            </article>
          ))}
        </Gallery>
      </section>
      <section className={styles.values}>
        <p className={styles.valuesEyebrow}>개인과 가족을 위한 이용 안내</p>
        <h2>우리 가족도 모스픽을 사용할 수 있을까요?</h2>
        <Gallery label="모스픽 개인 이용 절차">
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
      </section>
      <dialog
        ref={dialog}
        className={styles.dialog}
        onClose={onDialogClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeFeature();
        }}
        aria-labelledby="renewal-feature-title"
      >
        <button
          className={styles.close}
          type="button"
          onClick={closeFeature}
          aria-label="상세 설명 닫기"
        >
          ×
        </button>
        {active !== null && (
          <div>
            <h2 id="renewal-feature-title">{features[active].title}</h2>
            <p>{features[active].body}</p>
            {features[active].image && (
              <Picture
                src={features[active].image}
                small={features[active].small}
                alt={features[active].alt}
                className={styles.dialogImage}
              />
            )}
          </div>
        )}
      </dialog>
    </main>
  );
}
