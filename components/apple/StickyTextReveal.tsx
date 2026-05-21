'use client';

import { useRef } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

const texts = [
  '모스픽은 몸이 자유롭지 않아도,\n일상을 이어갈 수 있도록 돕습니다.',
];

export default function StickyTextReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const op0 = useTransform(scrollYProgress, [0, 0.05, 1, 1], [0, 1, 1, 1]);
  const opacities = [op0];

  return (
    <div ref={ref} style={{ height: '175vh', background: '#fff' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '800px', padding: '0 40px', textAlign: 'center' }}>
          {texts.map((text, i) => (
            <motion.p key={i} style={{
              opacity: opacities[i],
              position: i === 0 ? 'relative' : 'absolute',
              inset: i === 0 ? 'auto' : 0,
              margin: 'auto',
              fontSize: 'clamp(24px, 3.6vw, 48px)',
              fontWeight: 600,
              color: '#1d1d1f',
              lineHeight: 1.2,
              letterSpacing: '-0.022em',
              wordBreak: 'keep-all',
              whiteSpace: 'pre-line',
            }}>
              {text}
            </motion.p>
          ))}
        </div>
      </div>
    </div>
  );
}
