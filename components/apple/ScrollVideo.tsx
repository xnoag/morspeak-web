'use client';

import { useRef, useEffect } from 'react';
import { useScroll } from 'framer-motion';

interface ScrollVideoProps {
  src: string;
  height?: string;
  caption?: string;
}

export default function ScrollVideo({ src, height = '300vh', caption }: ScrollVideoProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const unsubscribe = scrollYProgress.on('change', (v) => {
      if (video.duration) {
        video.currentTime = v * video.duration;
      }
    });

    return unsubscribe;
  }, [scrollYProgress]);

  return (
    <div ref={sectionRef} style={{ height, position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#000' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        >
          <source src={src} type="video/mp4" />
        </video>
        {caption && (
          <p style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(245,245,247,0.6)', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
