import Image from 'next/image';

export default function MorspeakLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/morspeak-logo2.svg"
      alt="Morspeak"
      width={129}
      height={36}
      className={className}
      priority
    />
  );
}
