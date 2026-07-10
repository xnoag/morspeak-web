import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '모스픽 | Morspeak',
  description: '리뉴얼 중입니다.',
};

export default function RenewalPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', objectFit: 'cover', transform: 'translate(-50%, -50%)' }}
      >
        <source src="/renewal.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fff', fontSize: 'clamp(24px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
          리뉴얼 중입니다
        </p>
      </div>
    </div>
  );
}
