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

// Match the reference's subtle 5% push-in, overlapping dissolve, and replay state.
const HERO_STEP_MS = 5000;
const HERO_ZOOM_MS = 5500;
const HERO_FADE_MS = 450;
const HERO_END_MS = (heroSlides.length - 1) * HERO_STEP_MS + HERO_ZOOM_MS;

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
  const finished = elapsed >= HERO_END_MS;
  const playing = !reducedMotion && !paused && visible && pageVisible && !finished;

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
        elapsedRef.current = Math.min(HERO_END_MS, elapsedRef.current + Math.min(now - previous, 100));
        setElapsed(elapsedRef.current);
      }
      previous = now;
      if (elapsedRef.current < HERO_END_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const togglePlayback = () => {
    if (finished) {
      elapsedRef.current = 0;
      setElapsed(0);
      setPaused(false);
    } else setPaused(value => !value);
  };
  const active = reducedMotion ? 0 : Math.min(heroSlides.length - 1, Math.floor(elapsed / HERO_STEP_MS));

  return (
    <div ref={ref} className={styles.heroSlideshow}>
      {heroSlides.map((slide, index) => {
        const age = reducedMotion ? 0 : elapsed - index * HERO_STEP_MS;
        const progress = Math.max(0, Math.min(1, age / HERO_ZOOM_MS));
        const scale = reducedMotion ? 1 : 1 + 0.05 * (1 - (1 - progress) ** 2);
        const opacity = reducedMotion ? (index === 0 ? 1 : 0) : index === 0 ? 1 : Math.max(0, Math.min(1, age / HERO_FADE_MS));
        return (
          <div
            key={slide.src}
            className={styles.heroSlide}
            data-slide={index}
            aria-hidden={index !== active}
            style={{ opacity, zIndex: index }}
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
          onClick={togglePlayback}
          aria-label={finished ? "Replay hero slideshow" : paused ? "Play hero slideshow" : "Pause hero slideshow"}
          aria-pressed={paused}
        >
          <svg viewBox="0 0 36 36" aria-hidden="true">
            {finished ? (
              <path d="M25 18a7 7 0 1 1-7-7h2m-3-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            ) : paused ? (
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

const features = [
  {
    title: "VoiceOver",
    body: "Hear detailed descriptions of what’s in view, just by asking.",
    image: "/renewal-reference/morspeak-bedside-illustration-v4.webp",
    small: "/renewal-reference/morspeak-bedside-illustration-v4.webp",
    bg: "#f5f5f7",
    light: false,
  },
  {
    title: "Generated Subtitles",
    body: "Get real-time captioning for shared or personal videos.",
    image: "/renewal-reference/morspeak-light-control-illustration-v3.webp",
    small: "/renewal-reference/morspeak-light-control-illustration-v3.webp",
    bg: "#c9eeff",
    light: false,
  },
  {
    title: "AirPods Pro 3 + Hearing Health",
    body: "Set up a clinical-grade Hearing Aid feature.",
    image:
      pc.imgIllustrationOfCloseUpSideProfileOfAManWearingAirPodsPro3InLeftEar,
    bg: "#673627",
    light: true,
  },
  {
    title: "Personal Voice",
    image:
      pc.imgIPhone17ScreenShowingPersonalVoiceFeatureWithInstructionsOnHowToCreateYourPersonalVoice,
    bg: "#f5f5f7",
    light: false,
  },
];
const resources = [
  {
    title: "Support Videos",
    body: "Learn tips and how-tos from Apple Support on YouTube.",
    icon: pc.imgOriginalSvg4,
    href: "https://www.youtube.com/applesupport",
  },
  {
    title: "Accessibility Support",
    body: "Get help with your features or connect with an expert.",
    icon: pc.imgOriginalSvg6,
    href: "https://support.apple.com/accessibility",
  },
  {
    title: "Accessibility Accessories",
    body: "Shop assistive accessories for your Apple devices.",
    icon: pc.imgOriginalSvg7,
    href: "https://www.apple.com/shop/accessories/all/accessibility",
  },
];
const stories = [
  {
    title: "A bold iPhone accessory that’s fit for every grip.",
    image: pc.imgOriginalVideoPosterHikawa,
    small: mobile.imgOriginalVideoPosterHikawa,
    href: "https://www.apple.com/accessibility/",
  },
  {
    title:
      "Designed for Every Student highlights how accessibility features help all learners excel.",
    image:
      pc.imgADiverseGroupOfCollegeStudentsIncludingAWheelchairUserCheeringDancingAndStrikingEnergeticPosesAgainstABlueBackground,
    small:
      mobile.imgADiverseGroupOfCollegeStudentsIncludingAWheelchairUserCheeringDancingAndStrikingEnergeticPosesAgainstABlueBackground,
    href: "https://www.apple.com/accessibility/designed-for-students/",
  },
];
const news = [
  [
    "UPDATE",
    "Siri AI, a profoundly more capable and personal assistant, is here",
    "September 14, 2026",
    pc.imgImage,
    mobile.imgImage,
    "https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/",
  ],
  [
    "PRESS RELEASE",
    "Introducing Apple Watch Series 12, with the all-new Health Sensing System",
    "September 9, 2026",
    pc.imgImage1,
    mobile.imgImage1,
    "https://www.apple.com/newsroom/2026/09/introducing-apple-watch-series-12-with-the-all-new-health-sensing-system/",
  ],
  [
    "PRESS RELEASE",
    "Apple Intelligence brings powerful AI capabilities into everyday experiences",
    "June 8, 2026",
    pc.imgImage2,
    mobile.imgImage2,
    "https://www.apple.com/newsroom/2026/06/apple-intelligence-brings-powerful-ai-capabilities-into-everyday-experiences/",
  ],
  [
    "FEATURE",
    "Detroit’s rising developers are supported by the Apple Developer Academy",
    "May 29, 2026",
    pc.imgImage3,
    mobile.imgImage3,
    "https://www.apple.com/newsroom/2026/05/detroits-rising-developers-are-supported-by-the-apple-developer-academy/",
  ],
  [
    "PRESS RELEASE",
    "Apple unveils new accessibility features, and updates with Apple Intelligence",
    "May 19, 2026",
    pc.imgImage4,
    mobile.imgImage4,
    "https://www.apple.com/newsroom/2026/05/apple-unveils-new-accessibility-features-and-updates-with-apple-intelligence/",
  ],
  [
    "UPDATE",
    "AI meets accessibility in this year’s Swift Student Challenge",
    "May 7, 2026",
    pc.imgImage5,
    mobile.imgImage5,
    "https://www.apple.com/newsroom/2026/05/ai-meets-accessibility-in-this-years-swift-student-challenge/",
  ],
];
const values = [
  {
    title: "Education",
    body: "We empower students and educators to learn, create, and define their own success.",
    icon: pc.imgGraduationcapElevatedNp,
    href: "https://www.apple.com/education/",
  },
  {
    title: "Environment",
    body: "We’re committed to bringing net emissions to zero across our entire carbon footprint by 2030.",
    icon: pc.imgOriginalSvg10,
    href: "https://www.apple.com/environment/",
  },
  {
    title: "Inclusion and Diversity",
    body: "We’re holding ourselves accountable for creating a culture where everyone belongs.",
    icon: pc.imgOriginalSvg11,
    href: "https://www.apple.com/diversity/",
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
  "We discover new possibilities in small movements. Everyone connects with the world in their way. We adapt technology to each individual, opening up ways to express and connect. Through flexible solutions, we expand the possibilities of everyday life.";

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
            <span>Small,</span>{" "}
            <span>Yet Significant</span>
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
        <Gallery label="Accessibility features">
          {features.map((card, i) => (
            <article
              className={`${styles.featureCard} ${card.light ? styles.light : ""}`}
              style={{ background: card.bg }}
              key={card.title}
            >
              <Picture
                src={card.image}
                small={card.small}
                className={`${styles.featureImage} ${i < 2 ? styles.featureArtwork : ""}`}
                alt={i === 0 ? "A person in bed communicating through Morspeak on a mounted tablet" : i === 1 ? "A wheelchair user controlling a light through Morspeak on a mounted tablet" : card.title}
              />
              {i < 3 && (
                <div className={styles.featureCopy}>
                  <p>{card.title}</p>
                  <h3>{card.body}</h3>
                </div>
              )}
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
          <span className={styles.resourceIntroLine}>
            We don’t limit people to one way.
            <br />
          </span>
          We adapt technology
          <br className={styles.resourceMobileBreak} />
          {" "}to each individual.
        </h2>
        <Gallery label="Accessibility resources">
          {resources.map((card) => (
            <a
              className={styles.resourceCard}
              key={card.title}
              href={card.href}
              target="_blank"
              rel="noreferrer"
            >
              <img className={styles.resourceIcon} src={card.icon} alt="" />
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <span className={styles.external}>
                <img src={pc.imgOriginalSvg5} alt="" />
              </span>
            </a>
          ))}
        </Gallery>
      </section>
      <section className={styles.stories}>
        <h2>
          <span>Discover how Morspeak creates</span>
          <span>
            a lasting impact on
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
                alt={card.title}
              />
              <div className={styles.scrim} />
              <div className={styles.storyCopy}>
                <h3>{card.title}</h3>
                <a href={card.href} target="_blank" rel="noreferrer">
                  Watch now
                </a>
              </div>
              <a
                className={styles.play}
                href={card.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Watch: ${card.title}`}
              >
                <img src={pc.imgOriginalSvg8} alt="" />
              </a>
            </article>
          ))}
        </Gallery>
      </section>
      <section className={styles.news}>
        <h2>More from Apple on accessibility.</h2>
        <div className={styles.newsGrid}>
          {news.map(([type, title, date, image, small, href]) => (
            <a
              href={href}
              className={styles.newsItem}
              key={title}
              target="_blank"
              rel="noreferrer"
            >
              <Picture
                src={image}
                small={small}
                className={styles.newsImage}
                alt=""
              />
              <div>
                <p className={styles.newsType}>{type}</p>
                <h3>{title}</h3>
                <p className={styles.date}>{date}</p>
              </div>
            </a>
          ))}
        </div>
        <a
          className={styles.showMore}
          href="https://www.apple.com/newsroom/"
          target="_blank"
          rel="noreferrer"
        >
          <img src={pc.imgOriginalSvg9} alt="" />
          Show more
        </a>
      </section>
      <section className={styles.values}>
        <h2>Our values lead the way.</h2>
        <Gallery label="Values">
          {values.map((card) => (
            <article className={styles.valueCard} key={card.title}>
              <div className={styles.valueIcon}>
                <img src={card.icon} alt="" />
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <a href={card.href} target="_blank" rel="noreferrer">
                Learn more
              </a>
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
            <Picture
              src={features[active].image}
              small={features[active].small}
              alt={features[active].title}
              className={styles.dialogImage}
            />
            <a
              href="https://www.apple.com/accessibility/features/"
              target="_blank"
              rel="noreferrer"
            >
              Browse all features
            </a>
          </div>
        )}
      </dialog>
    </main>
  );
}
