'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const BASE = 'https://www.apple.com/v/apple-vision-pro/k/images/overview/design';
const VID = 'https://www.apple.com/105/media/us/apple-vision-pro/2025/fda8750c-030b-40f2-a0f7-60ba2db6b547/anim';

interface Item { title: string; body: string; image: string; video?: string }

const items: Item[] = [
  { title: '설계 혁신', body: 'Apple Vision Pro는 우리가 고성능, 모바일 그리고 웨어러블 기기에 있어 수십 년간 이룬 혁신을 바탕으로 한 결과물입니다. 첨단 기술과 우아한 형태가 착용할 때마다 놀라운 경험을 선사하죠.', image: `${BASE}/drawer/design_innovation_startframe__4mig33ckaf6y_large.jpg`, video: `${VID}/drawer-design-innovation/large.mp4` },
  { title: '듀얼 니트 밴드', body: '새로운 듀얼 니트 밴드는 부드러우면서 통기성이 뛰어난 스트랩과 균형 잡힌 디자인을 결합해 당신이 좋아하는 공간 경험에 더 오래 몰입할 수 있도록 해줍니다.', image: `${BASE}/drawer/dual_knit_band__cuhpalc1t9ea_large.jpg` },
  { title: '핏 다이얼', body: '두 가지 방식으로 작동하는 핏 다이얼은 밴드 상부 및 하부 스트랩을 각각 손쉽게 조절해 자신에게 꼭 맞는 편안한 핏으로 바꿀 수 있도록 해주죠.', image: `${BASE}/drawer/headband_startframe__dd6bzq5p6lqq_large.jpg`, video: `${VID}/drawer-design-headband/large.mp4` },
  { title: '라이트실', body: '라이트실은 알루미늄 합금 프레임에 자석으로 부착되고 얼굴 모양에 맞게 부드럽게 구부러져, 정밀한 핏을 제공하는 동시에 외부에서 들어오는 미광을 차단해 줍니다.', image: `${BASE}/drawer/light_seal_startframe__edlebmd6r1aq_large.jpg`, video: `${VID}/drawer-design-light-seal/large.mp4` },
  { title: '공간 음향', body: '귀에 가깝게 위치한 스피커가 주변 환경의 소리와 자연스럽게 조화를 이루는 풍성한 공간 음향을 선사하는 동시에 늘 주변 상황을 인지할 수 있도록 해주죠.', image: `${BASE}/drawer/spatial_audio__fc9n50cxmcmm_large.jpg` },
  { title: 'Digital Crown', body: 'Digital Crown을 누르면 \'홈 보기\'가 표시되고, \'환경\' 기능 사용 시 Digital Crown을 돌리면 몰입감을 조절할 수 있습니다.', image: `${BASE}/drawer/digital_crown__glqazc7c6qeu_large.jpg` },
  { title: '배터리', body: 'Apple Vision Pro는 주머니에 쏙 들어가는 알루미늄 마감 외장 배터리로 구동됩니다. 최대 2.5시간의 일반 사용과 최대 3시간의 동영상 재생을 지원하죠.¹', image: `${BASE}/drawer/battery__cjkato9jqdjm_large.jpg` },
  { title: 'ZEISS Optical Inserts', body: 'ZEISS Optical Inserts를 당신의 시력 처방에 따라 맞춤 제작할 수 있으며,² 렌즈에 자석 방식으로 부착되어 또렷한 시각과 정밀한 눈 추적 성능을 지원합니다.', image: `${BASE}/drawer/optical_inserts__dlbxctpips66_large.jpg` },
  { title: '솔로 니트 밴드', body: '별도로 판매되는 솔로 니트 밴드는 편안한 쿠션감과 통기성, 신축성을 제공합니다.', image: `${BASE}/drawer/solo_knit_band__duemuduoceoi_large.jpg` },
];

function Item({ item, isOpen, onToggle }: { item: Item; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderTop: '1px solid #d2d2d7' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '19px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.015em' }}>{item.title}</span>
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0, marginLeft: '16px' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="#6e6e73" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div key="c" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.4,0,0.2,1] }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingBottom: '32px' }}>
              {item.video ? (
                <video autoPlay muted loop playsInline src={item.video} style={{ width: '100%', borderRadius: '14px', display: 'block', marginBottom: '20px', objectFit: 'cover', maxHeight: '400px' }} />
              ) : (
                <img src={item.image} alt={item.title} style={{ width: '100%', borderRadius: '14px', display: 'block', marginBottom: '20px', objectFit: 'cover', maxHeight: '400px' }} />
              )}
              <p style={{ fontSize: '17px', lineHeight: 1.7, color: '#6e6e73', letterSpacing: '-0.01em' }}>{item.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AccordionSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section style={{ background: '#fff', padding: '80px 0' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 22px' }}>
        {items.map((item, i) => (
          <Item key={item.title} item={item} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
        ))}
        <div style={{ borderTop: '1px solid #d2d2d7' }} />
      </div>
    </section>
  );
}
