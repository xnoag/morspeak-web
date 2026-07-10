import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '모스픽 | Morspeak',
  description: '찾아주셔서 감사합니다. 모스픽 홈페이지를 새단장중이에요. 곧 만나요 👋🏻',
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
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <div>
          <p style={{ color: '#fff', fontSize: 'clamp(15px, 2vw, 20px)', fontWeight: 500, opacity: 0.85, marginBottom: 10, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            찾아주셔서 감사합니다
          </p>
          <p style={{ color: '#fff', fontSize: 'clamp(22px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            모스픽 홈페이지를 새단장중이에요. 곧 만나요 👋🏻
          </p>
        </div>
      </div>
    </div>
  );
}
