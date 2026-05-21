'use client';

import { useRef, useState, useEffect } from 'react';
import { useScroll, useTransform, AnimatePresence, motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomSection {
  bg: string;
  textColor: 'dark' | 'light';
  title: string;
  body: string;
  screenImage: string;
  icon?: string;
  link: { label: string; href: string };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ROOM_SECTIONS: RoomSection[] = [
  {
    bg: '#f5f5f7',
    textColor: 'dark',
    title: '인사이트.',
    body: 'Apple Original 시리즈 및 영화를 시청하면서, 동시에 관련 정보를 확인할 수 있습니다. 미디어 플레이어 제어기를 불러오기만 하면 화면에 등장하는 배우와 지금 흘러나오는 음악에 대해 더 자세히 알 수 있죠.',
    screenImage:
      'https://www.apple.com/kr/apple-tv-4k/images/overview/rooms/screen_insight__gltkr8q637iq_large.jpg',
    link: { label: '구독 후 Apple TV 앱에서 시청하기', href: '#' },
  },
  {
    bg: '#6441e6',
    textColor: 'light',
    title: 'Apple Music.',
    body: '1억 곡 이상의 노래, 30,000개의 플레이리스트, 그리고 라디오 생방송까지 큰 화면에서 여유롭게 감상하세요. Apple Music Sing으로 톱 가수가 된 듯한 기분을 느껴볼 수도 있습니다.',
    screenImage:
      'https://www.apple.com/v/apple-tv-4k/am/images/overview/rooms/screen_music__ggo4ihn7xka6_large.jpg',
    icon: 'https://www.apple.com/v/apple-tv-4k/am/images/overview/rooms/apple_music_app__dq9y5etz3zcm_large.png',
    link: { label: '더 알아보기', href: '/kr/apple-music/' },
  },
  {
    bg: '#1a1a1a',
    textColor: 'light',
    title: 'Apple Arcade.',
    body: '큰 화면에서 더 큰 몰입감을 자랑하는 Apple Arcade 게임을 즐겨보세요. 가입비 하나로 iPhone, iPad, Mac에서도 플레이할 수 있습니다.',
    screenImage:
      'https://www.apple.com/v/apple-tv-4k/am/images/overview/rooms/screen_arcade__ep47apforssy_large.jpg',
    icon: 'https://www.apple.com/v/apple-tv-4k/am/images/overview/rooms/apple_arcade_app__bpy1osgcepv6_large.png',
    link: { label: '더 알아보기', href: '/kr/apple-arcade/' },
  },
];

// ─── Apple TV Local Nav ───────────────────────────────────────────────────────

function AppleTVLocalNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: '44px',
        zIndex: 9998,
        height: '52px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a
            href="/appletv"
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#1d1d1f',
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Apple TV 4K
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {[
              { label: '개요', href: '#overview', active: true },
              { label: '제품 사양', href: '#specs', active: false },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  fontSize: '13px',
                  color: '#1d1d1f',
                  textDecoration: 'none',
                  opacity: item.active ? 1 : 0.65,
                  position: 'relative',
                  paddingBottom: '2px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.opacity = item.active ? '1' : '0.65')
                }
              >
                {item.label}
                {item.active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-16px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '100%',
                      height: '2px',
                      background: '#1d1d1f',
                      borderRadius: '1px',
                    }}
                  />
                )}
              </a>
            ))}
          </div>
        </div>

        <a
          href="/kr/shop/goto/buy_tv/apple_tv_4k"
          style={{
            fontSize: '13px',
            color: '#fff',
            textDecoration: 'none',
            background: '#0071e3',
            padding: '7px 16px',
            borderRadius: '980px',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.background = '#0077ed')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.background = '#0071e3')
          }
        >
          구입하기 Apple TV 4K
        </a>
      </div>
    </nav>
  );
}

// ─── iPad Mockup ──────────────────────────────────────────────────────────────

function IPadMockup({ screenImage }: { screenImage: string }) {
  return (
    <div
      style={{
        width: '300px',
        flexShrink: 0,
        background: '#1c1c1e',
        borderRadius: '44px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
        aspectRatio: '9/16',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* front camera */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#2c2c2e',
          zIndex: 2,
        }}
      />
      {/* screen */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          margin: '36px 10px 20px',
          borderRadius: '12px',
        }}
      >
        <img
          src={screenImage}
          alt="앱 화면"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      {/* home indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80px',
          height: '4px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.3)',
        }}
      />
    </div>
  );
}

// ─── Scroll-Driven Rooms Section ──────────────────────────────────────────────

function ScrollDrivenRooms() {
  const containerRef = useRef<HTMLDivElement>(null);
  const N = ROOM_SECTIONS.length;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Track which section we're in and the split percentage
  const [currentIndex, setCurrentIndex] = useState(0);
  const [splitPct, setSplitPct] = useState(100);
  const [nextIndex, setNextIndex] = useState<number | null>(null);

  useEffect(() => {
    return scrollYProgress.on('change', (progress: number) => {
      // Each section occupies 1/N of total scroll
      const rawSection = progress * N;
      const sectionIndex = Math.floor(rawSection);
      const clamped = Math.min(sectionIndex, N - 1);
      const withinSection = rawSection - sectionIndex;

      // Transition zone: last 30% of each section transitions to next
      const TRANSITION_START = 0.7;

      if (clamped < N - 1 && withinSection >= TRANSITION_START) {
        const t = (withinSection - TRANSITION_START) / (1 - TRANSITION_START);
        // splitPct goes 100 → 0 (top color shrinks down)
        setSplitPct(Math.round((1 - t) * 100));
        setCurrentIndex(clamped);
        setNextIndex(clamped + 1);
      } else {
        setSplitPct(100);
        setCurrentIndex(clamped);
        setNextIndex(null);
      }
    });
  }, [scrollYProgress, N]);

  const current = ROOM_SECTIONS[currentIndex];
  const next = nextIndex !== null ? ROOM_SECTIONS[nextIndex] : null;

  // Background: split gradient between current and next
  const background =
    next !== null
      ? `linear-gradient(to bottom, ${current.bg} ${splitPct}%, ${next.bg} ${splitPct}%)`
      : current.bg;

  const isDark = current.textColor === 'light';
  const textColor = isDark ? '#ffffff' : '#1d1d1f';
  const subColor = isDark ? 'rgba(255,255,255,0.75)' : '#6e6e73';
  const linkColor = isDark ? '#ffffff' : '#0071e3';

  return (
    <div
      ref={containerRef}
      style={{ height: `${N * 100}vh`, position: 'relative' }}
    >
      <div
        style={{
          position: 'sticky',
          top: '96px', // 44px AppleNav + 52px local nav
          height: 'calc(100vh - 96px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
          transition: 'background 0s', // let JS handle the animation
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '980px',
            padding: '0 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '60px',
          }}
        >
          {/* Left: text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {current.icon && (
                  <img
                    src={current.icon}
                    alt={current.title}
                    style={{ width: '64px', height: '64px', borderRadius: '14px', marginBottom: '20px', display: 'block' }}
                  />
                )}
                <h2
                  style={{
                    fontSize: 'clamp(36px, 4vw, 56px)',
                    fontWeight: 700,
                    color: textColor,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    margin: '0 0 20px',
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                  }}
                >
                  {current.title}
                </h2>
                <p
                  style={{
                    fontSize: '17px',
                    lineHeight: 1.65,
                    color: subColor,
                    margin: '0 0 28px',
                    maxWidth: '380px',
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                  }}
                >
                  {current.body}
                </p>
                <a
                  href={current.link.href}
                  style={{
                    fontSize: '17px',
                    color: linkColor,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {current.link.label}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M5.5 1L9 5l-3.5 4M9 5H1" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: iPad mockup */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <IPadMockup screenImage={current.screenImage} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function Section({
  children,
  bg = '#ffffff',
  style,
}: {
  children: React.ReactNode;
  bg?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        background: bg,
        borderTop: '1px solid #d2d2d7',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: '980px',
        margin: '0 auto',
        padding: '0 22px',
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppleTVPage() {
  return (
    <main
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        color: '#1d1d1f',
      }}
    >
      {/* 1. Local Nav */}
      <AppleTVLocalNav />

      {/* 2. Hero */}
      <section
        id="overview"
        style={{
          background: '#000000',
          borderTop: '1px solid #1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          paddingBottom: '0',
        }}
      >
        <div
          style={{
            maxWidth: '980px',
            margin: '0 auto',
            padding: '80px 22px 0',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: '#6e6e73',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Apple TV 4K
          </p>
          <h1
            style={{
              fontSize: 'clamp(32px, 4.5vw, 64px)',
              fontWeight: 700,
              color: '#f5f5f7',
              letterSpacing: '-0.025em',
              lineHeight: 1.08,
              maxWidth: '800px',
              margin: '0 auto 40px',
            }}
          >
            보다 장대하게 경험하는
            <br />
            Apple의 모든 것
          </h1>
          <a
            href="/kr/shop/goto/buy_tv/apple_tv_4k"
            style={{
              display: 'inline-block',
              fontSize: '17px',
              color: '#fff',
              background: '#0071e3',
              padding: '12px 22px',
              borderRadius: '980px',
              textDecoration: 'none',
              marginBottom: '60px',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = '#0077ed')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = '#0071e3')
            }
          >
            구입하기 Apple TV 4K
          </a>
        </div>

        {/* Hero images */}
        <div
          style={{
            position: 'relative',
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <img
            src="https://www.apple.com/v/apple-tv-4k/am/images/overview/hero/hero_tv_hw__e1vadywlvcmu_large.jpg"
            alt="Apple TV 4K와 연결된 대형 TV"
            style={{
              width: '100%',
              maxWidth: '900px',
              borderRadius: '18px 18px 0 0',
              display: 'block',
            }}
          />
          <img
            src="https://www.apple.com/v/apple-tv-4k/am/images/overview/hero/hero_tv_remote__da02803g5doy_large.png"
            alt="Siri Remote"
            style={{
              position: 'absolute',
              right: '8%',
              bottom: '0',
              width: '11%',
              maxWidth: '110px',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
            }}
          />
        </div>
      </section>

      {/* 3. Content description */}
      <Section bg="#ffffff">
        <Container>
          <div
            style={{
              padding: '80px 0',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 'clamp(22px, 2.5vw, 32px)',
                fontWeight: 500,
                color: '#1d1d1f',
                lineHeight: 1.45,
                maxWidth: '680px',
                margin: '0 auto',
                letterSpacing: '-0.01em',
              }}
            >
              Apple TV 4K는 당신이 즐겨 쓰는 Apple 서비스와 이용 중인 모든 스트리밍 앱을 한곳에서.
            </p>
          </div>
        </Container>
      </Section>

      {/* 4. Scroll-driven rooms */}
      <section style={{ borderTop: '1px solid #d2d2d7' }}>
        <ScrollDrivenRooms />
      </section>

      {/* 5. FaceTime */}
      <Section bg="#ffffff">
        <Container>
          <div style={{ padding: '100px 0 60px', textAlign: 'center' }}>
            <h2
              style={{
                fontSize: 'clamp(28px, 3.5vw, 48px)',
                fontWeight: 700,
                color: '#1d1d1f',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: '0 0 20px',
              }}
            >
              FaceTime을 당신의 가장 큰 화면에서
            </h2>
            <p
              style={{
                fontSize: '17px',
                lineHeight: 1.65,
                color: '#6e6e73',
                maxWidth: '580px',
                margin: '0 auto 50px',
              }}
            >
              Apple TV 4K의 FaceTime 앱은 당신의 iPhone이나 iPad와 매끄럽게 연결되며, 당신이 편안하게 앉아 있는 동안 새로운 Center Stage 기능이 자동으로 추적해 화면 중앙에 위치시켜 줍니다.
            </p>
          </div>
        </Container>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 22px 0' }}>
          <img
            src="https://www.apple.com/v/apple-tv-4k/am/images/overview/facetime/facetime__exrio2z3zuie_large.jpg"
            alt="FaceTime on Apple TV 4K"
            style={{ width: '100%', borderRadius: '18px', display: 'block' }}
          />
        </div>
      </Section>

      {/* 6. Smart Home */}
      <Section bg="#ffffff">
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '100px 22px 0',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(28px, 3.5vw, 48px)',
              fontWeight: 700,
              color: '#1d1d1f',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: '0 0 20px',
            }}
          >
            조명, 카메라, 스마트 홈을 다루는 법
          </h2>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.65,
              color: '#6e6e73',
              maxWidth: '580px',
              margin: '0 auto 50px',
            }}
          >
            Apple TV 4K는 스마트 홈의 허브 역할을 합니다. 조명을 조절하고, 보안 카메라를 확인하고, 도어벨에 응답하고, 자동화 루틴을 설정하세요. 집 안 어디서든, 심지어 외출 중에도.
          </p>
          <img
            src="https://www.apple.com/v/apple-tv-4k/am/images/overview/home-control/smart_home_hub__cz2n3396ujsm_large.jpg"
            alt="스마트 홈 허브"
            style={{ width: '100%', borderRadius: '18px', display: 'block' }}
          />
        </div>
      </Section>

      {/* 7. Product comparison */}
      <Section bg="#ffffff">
        <Container>
          <div style={{ padding: '100px 0' }}>
            <h2
              style={{
                fontSize: 'clamp(28px, 3vw, 40px)',
                fontWeight: 700,
                color: '#1d1d1f',
                letterSpacing: '-0.02em',
                textAlign: 'center',
                margin: '0 0 60px',
              }}
            >
              당신에게 알맞은 Apple TV 4K 모델은?
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px',
              }}
            >
              {[
                {
                  image:
                    'https://www.apple.com/v/apple-tv-4k/am/images/overview/compare/apple_4k_wifi__fpjm9mmlrzyy_large.jpg',
                  name: 'Apple TV 4K Wi-Fi',
                  price: '₩189,000',
                  href: '/kr/shop/goto/buy_tv/apple_tv_4k',
                },
                {
                  image:
                    'https://www.apple.com/v/apple-tv-4k/am/images/overview/compare/apple_4k_ethernet__dbqrjd7wvsuq_large.jpg',
                  name: 'Apple TV 4K Wi-Fi + 이더넷',
                  price: '₩209,000',
                  href: '/kr/shop/goto/buy_tv/apple_tv_4k',
                },
              ].map((product) => (
                <div
                  key={product.name}
                  style={{
                    background: '#f5f5f7',
                    borderRadius: '18px',
                    padding: '40px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '20px',
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: '100%',
                      maxWidth: '280px',
                      borderRadius: '12px',
                      display: 'block',
                    }}
                  />
                  <h3
                    style={{
                      fontSize: '21px',
                      fontWeight: 600,
                      color: '#1d1d1f',
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {product.name}
                  </h3>
                  <p
                    style={{
                      fontSize: '17px',
                      color: '#6e6e73',
                      margin: 0,
                    }}
                  >
                    {product.price}부터
                  </p>
                  <a
                    href={product.href}
                    style={{
                      display: 'inline-block',
                      fontSize: '15px',
                      color: '#fff',
                      background: '#0071e3',
                      padding: '10px 20px',
                      borderRadius: '980px',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.background = '#0077ed')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.background = '#0071e3')
                    }
                  >
                    구입하기
                  </a>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
