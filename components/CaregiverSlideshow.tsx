'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const slides = [
  { src: 'https://framerusercontent.com/images/sOdCdxICKPt8APx1KmEmPl12Qhk.png', alt: '모스픽 앱 - 말 건네기 기능' },
  { src: 'https://framerusercontent.com/images/B2igMwrtw4VFsejH0NCakAgQ2k.png', alt: '모스픽 앱 - 조명 제어 기능' },
  { src: 'https://framerusercontent.com/images/6OFLrhjW56mz6AzKPCl0DuFboA.png', alt: '모스픽 앱 - 영상 시청 기능' },
];

interface CaregiverSlideshowProps {
  heading?: string;
  body?: string;
}

export default function CaregiverSlideshow({
  heading = '환우와 보호자\n모두를 위한',
  body = '환우의 호출은 모스픽이 알려드립니다 — 그동안은 마음 편히, 보호자만의 시간을 가지세요.',
}: CaregiverSlideshowProps) {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  return (
    <section className="py-28 px-6" style={{ background: '#0a0a0a' }}>
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-16"
        >
          <h2
            className="font-bold whitespace-pre-line mb-6"
            style={{
              fontSize: 'clamp(36px, 6vw, 68px)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#f5f5f7',
            }}
          >
            {heading}
          </h2>
          <p
            className="text-[18px] md:text-[20px] max-w-2xl mx-auto"
            style={{ color: 'rgba(245,245,247,0.55)', letterSpacing: '-0.01em', lineHeight: 1.6 }}
          >
            {body}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl"
          style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}
        >
          <Image
            src={slides[current].src}
            alt={slides[current].alt}
            width={1100}
            height={625}
            className="w-full transition-opacity duration-400"
          />

          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
            aria-label="이전"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
            aria-label="다음"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? '20px' : '8px',
                  height: '8px',
                  background: i === current ? 'white' : 'rgba(255,255,255,0.35)',
                }}
                aria-label={`슬라이드 ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
