'use client';

import { CarouselCard } from './FeatureCarousel';
import FeatureCarousel from './FeatureCarousel';

interface ProductSectionProps {
  id?: string;
  eyebrow: string;
  headline: string;
  body: string;
  link?: { label: string; href: string };
  cards: CarouselCard[];
  heroImage?: string;
  heroVideo?: string;
  callout?: string;
}

export default function ProductSection({ id, eyebrow, headline, body, link, cards, heroImage, heroVideo, callout }: ProductSectionProps) {
  return (
    <section id={id} style={{ background: '#fff', padding: '80px 0' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 22px' }}>
        <p style={{ fontSize: '17px', color: '#6e6e73', marginBottom: '8px', letterSpacing: '-0.01em' }}>{eyebrow}</p>
        <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 52px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em', lineHeight: 1.1, marginBottom: '24px', maxWidth: '700px' }}>
          {headline}
        </h2>

        {/* Video preferred over image */}
        {heroVideo ? (
          <video
            autoPlay muted loop playsInline
            style={{ width: '100%', borderRadius: '18px', display: 'block', marginBottom: '12px' }}
          >
            <source src={heroVideo} type="video/mp4" />
            {heroImage && <img src={heroImage} alt={eyebrow} style={{ width: '100%', borderRadius: '18px' }} />}
          </video>
        ) : heroImage ? (
          <img src={heroImage} alt={eyebrow} style={{ width: '100%', borderRadius: '18px', display: 'block', marginBottom: '12px', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '480px', background: '#e8e8ed', borderRadius: '18px', marginBottom: '12px' }} />
        )}

        {callout && <p style={{ fontSize: '12px', color: '#6e6e73', marginBottom: '32px' }}>{callout}</p>}

        <p style={{ fontSize: '19px', color: '#1d1d1f', lineHeight: 1.7, letterSpacing: '-0.01em', marginBottom: link ? '16px' : '48px', maxWidth: '700px' }}>
          {body}
        </p>

        {link && (
          <a href={link.href} style={{ fontSize: '19px', color: '#0066cc', textDecoration: 'none', display: 'block', marginBottom: '48px' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >{link.label} ›</a>
        )}

        <FeatureCarousel cards={cards} />
      </div>
    </section>
  );
}
