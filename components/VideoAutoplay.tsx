'use client';

interface VideoAutoplayProps {
  src: string;
  className?: string;
  poster?: string;
}

export default function VideoAutoplay({ src, className, poster }: VideoAutoplayProps) {
  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      className={className}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
