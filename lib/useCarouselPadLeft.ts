'use client';

import { useState, useEffect } from 'react';

export function useCarouselPadLeft(contentWidth = 980, innerPad = 22): number {
  const [padLeft, setPadLeft] = useState(innerPad);
  useEffect(() => {
    const calc = () =>
      setPadLeft(Math.max(innerPad, (window.innerWidth - contentWidth) / 2 + innerPad));
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [contentWidth, innerPad]);
  return padLeft;
}
