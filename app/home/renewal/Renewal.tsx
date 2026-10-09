"use client";

/* The current homepage Figma frames are the source of truth. The Apple copy
   and artwork remain reference content until replaced in the design. */
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
import styles from "./renewal.module.css";

const heroSlides = [
  "A person in bed using Morspeak on a mounted tablet",
  "A caregiver connecting with a person through Morspeak",
  "An overhead view of a home connected through Morspeak",
  "Morspeak connecting small movements with everyday life",
].map((alt, index) => ({
  src: `/renewal-reference/hero-pc-${index + 1}${index === 3 ? "-phone" : ""}.webp`,
  small: `/renewal-reference/hero-mobile-${index + 1}${index === 3 ? "-phone" : ""}.webp`,
  alt,
}));

// Keep the subtle push-in and dissolve continuous, including the last-to-first transition.
const HERO_STEP_MS = 5000;
const HERO_ZOOM_MS = 5500;
const HERO_FADE_MS = 450;
const HERO_CYCLE_MS = heroSlides.length * HERO_STEP_MS;

function HeroSlideshow({ controlRight, controlBottom }: {
  controlRight: MotionValue<string>;
  controlBottom: MotionValue<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.2 });
  const reducedMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
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
    const tick = (now: number) => {
      const images = ref.current?.querySelectorAll<HTMLImageElement>("img");
      const ready = images && Array.from(images).every(image => image.complete && image.naturalWidth > 0);
      if (ready && previous !== undefined) {
        elapsedRef.current = (elapsedRef.current + Math.min(now - previous, 100)) % HERO_CYCLE_MS;
        setElapsed(elapsedRef.current);
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const active = reducedMotion ? 0 : Math.floor(elapsed / HERO_STEP_MS);
  const next = (active + 1) % heroSlides.length;
  const stepElapsed = elapsed % HERO_STEP_MS;
  const fade = Math.max(0, Math.min(1, (stepElapsed - HERO_STEP_MS + HERO_FADE_MS) / HERO_FADE_MS));

  return (
    <div ref={ref} className={styles.heroSlideshow}>
      {heroSlides.map((slide, index) => {
        const age = index === active ? stepElapsed + HERO_FADE_MS : index === next ? Math.max(0, stepElapsed - HERO_STEP_MS + HERO_FADE_MS) : 0;
        const progress = Math.max(0, Math.min(1, age / HERO_ZOOM_MS));
        const scale = reducedMotion ? 1 : 1 + 0.05 * (1 - (1 - progress) ** 2);
        const opacity = index === active ? 1 : index === next && !reducedMotion ? fade : 0;
        return (
          <div
            key={slide.src}
            className={styles.heroSlide}
            data-slide={index}
            aria-hidden={index !== active}
            style={{ opacity, zIndex: index === next ? 2 : index === active ? 1 : 0 }}
          >
            <div className={styles.heroZoom} style={{ transform: `scale(${scale})` }}>
              <Picture {...slide} className={styles.heroSlideImage} />
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
          aria-label={paused ? "Play hero slideshow" : "Pause hero slideshow"}
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
    title: "Communication",
    body: "One small move starts a conversation.",
    image: "/renewal-reference/morspeak-bedside-group-3.webp",
    small: "/renewal-reference/morspeak-bedside-group-3.webp",
    alt: "A person in bed communicating through Morspeak on a mounted tablet",
    bg: "#f5f5f7",
    light: false,
  },
  {
    title: "Home Control",
    body: "Need more light?\nTurn it on yourself.",
    image: "/renewal-reference/morspeak-light-control-illustration-v3.webp",
    small: "/renewal-reference/morspeak-light-control-illustration-v3.webp",
    alt: "A wheelchair user controlling a light through Morspeak on a mounted tablet",
    bg: "#fde7d3",
    light: false,
  },
  {
    title: "Caregiver Support",
    body: "Help when needed. Breathing room for caregivers.",
    image: "/renewal-reference/morspeak-sos-home-illustration-v2.webp",
    alt: "A person using Morspeak to send an SOS alert from home",
    bg: "#673627",
    light: true,
  },
  {
    title: "Connection",
    body: "Reconnect, one message at a time.",
    image: "/renewal-reference/morspeak-connection-illustration-v2.webp",
    alt: "A person using Morspeak to connect with a loved one through messages and video",
    bg: "#ff4800",
    light: false,
  },
  {
    title: "Entertainment",
    body: "Your music. Your videos. Your choice.",
    image: "/renewal-reference/morspeak-music-control-illustration.webp",
    alt: "A wheelchair user listening to music through a mounted Morspeak tablet",
    bg: "#cccccc",
    light: false,
  },
  {
    title: "Possibilities",
    body: "Imagine what’s next.\nWe’re with you.",
    image: "/renewal-reference/morspeak-possibilities-illustration.webp",
    alt: "A wheelchair user imagining conversations, music, videos, learning, and everyday activities through Morspeak",
    bg: "#fde7d3",
    light: false,
  },
];
type InputKind = "blink" | "mouth" | "frown" | "finger" | "breath" | "personalize";

const resources: { title: string; body: string; icon: InputKind }[] = [
  { title: "Eye Blink", body: "A simple blink can choose what you want to do next.", icon: "blink" },
  { title: "Mouth Movement", body: "Open your mouth to move through the app without touch.", icon: "mouth" },
  { title: "Frown", body: "Turn even a slight frown into a command you can use.", icon: "frown" },
  { title: "Finger Movement", body: "Even a tiny finger movement can help you make your next choice.", icon: "finger" },
  { title: "Breath", body: "Blow gently to choose your next step inside the app.", icon: "breath" },
  { title: "Your Way", body: "Choose the movement that works best for you, every day.", icon: "personalize" },
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
    source: "Apple",
    title: "Invited to WWDC, we introduced Morspeak to Tim Cook.",
    image: "/renewal-reference/morspeak-tim-cook-meeting.jpg",
    small: "/renewal-reference/morspeak-tim-cook-meeting.jpg",
    alt: "Morspeak founder introducing the app to Apple CEO Tim Cook at WWDC",
    href: "/articles/250609",
    external: false,
  },
  {
    source: "Smilegate Newsroom",
    title: "Creating Social Impact Through Technology Recognized by Apple",
    image: "/renewal-reference/morspeak-everyday-story-20261008.webp",
    small: "/renewal-reference/morspeak-everyday-story-20261008.webp",
    alt: "Morspeak in use at a bedside, alongside a person explaining it",
    href: "https://newsroom.smilegate.com/en/lab/morspeak_interview",
    external: true,
  },
];
const onboardingSteps = [
  {
    number: "01",
    title: "Assess remaining movement.",
    body: "Our test program measures which movements remain and how consistently each can be repeated.",
    href: "/waitlist",
  },
  {
    number: "02",
    title: "Find the right way to use it.",
    body: "We’ll explore which movements may work and explain the setup needed to get started.",
  },
  {
    number: "03",
    title: "Get support as you learn.",
    body: "We’ll provide training and setup help as needed, so you can use Morspeak with confidence.",
  },
];

function Picture({
  src,
  small,
  alt = "",
  className,
}: {
  src: string;
  small?: string;
  alt?: string;
  className?: string;
}) {
  return (
    <picture className={className}>
      {small && <source media="(max-width: 734px)" srcSet={small} />}
      <img src={src} alt={alt} />
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
  "We create assistive technology for people with motor disabilities. We discover new possibilities in small movements. Everyone connects with the world in their own way. We adapt technology to each individual, opening up new ways to express and connect.";

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
    <main className={styles.page} lang="en">
      <a href="#renewal-features" className={styles.skip}>
        Skip to features
      </a>
      <header className={styles.nav}>
        <a
          href="#renewal-overview"
          aria-label="Morspeak homepage"
        >
          <Picture
            src={pc.imgMorspeakLogoWhiteOriginalRgbVectors}
            small={mobile.imgMorspeakLogoWhiteOriginalRgbVectors}
            alt="Morspeak"
          />
        </a>
        <nav
          className={styles.desktopNav}
          aria-label="Main"
        >
          <a href="#renewal-overview">Overview</a>
          <a href="#renewal-features">Features</a>
        </nav>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Navigation menu"
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
          aria-label="Mobile main"
        >
          <a href="#renewal-overview" onClick={() => setMenu(false)}>
            Overview
          </a>
          <a href="#renewal-features" onClick={() => setMenu(false)}>
            Features
          </a>
        </nav>
      )}
      <Hero />
      <section className={styles.features} id="renewal-features">
        <div className={styles.featureHeading}>
          <h2>
            Expanding Possibilities
            <br />
            Through Flexible Solutions
          </h2>
        </div>
        <Gallery label="Morspeak solutions">
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
                aria-label={`Learn more about ${card.title}`}
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
          Your tiny movement.
          <br />
          Your way to control Morspeak.
        </h2>
        <Gallery label="Ways to control Morspeak">
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
          <span>Discover how Morspeak creates</span>
          <span>
            a lasting social impact on
            <br className={styles.storyMobileBreak} />
            {" "}everyday life.
          </span>
        </h2>
        <Gallery label="Accessibility stories" wide>
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
                  Read story
                </a>
              </div>
            </article>
          ))}
        </Gallery>
      </section>
      <section className={styles.values}>
        <p className={styles.valuesEyebrow}>For individuals and families</p>
        <h2>Could Morspeak work for your loved one?</h2>
        <Gallery label="Exploring Morspeak for personal use">
          {onboardingSteps.map((card) => (
            <article className={styles.valueCard} key={card.title} aria-label={`Step ${Number(card.number)}: ${card.title}`}>
              <div className={styles.valueIcon}>
                <span className={styles.stepNumber} aria-hidden="true">{card.number}</span>
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              {card.href && <a href={card.href}>Apply now (Korean form)</a>}
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
          aria-label="Close feature"
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
