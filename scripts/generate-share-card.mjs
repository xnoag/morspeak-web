// Regenerate with Node + the existing sharp dependency and Noto Sans CJK KR installed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const logo = readFileSync(new URL('../public/renewal-reference/4ba84cee3d3722.svg', import.meta.url));
const logoUrl = `data:image/svg+xml;base64,${logo.toString('base64')}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ff4800"/>
  <image href="${logoUrl}" x="390" y="110" width="420" height="66.29"/>
  <g fill="white" text-anchor="middle" font-family="Noto Sans CJK KR, sans-serif">
    <text x="600" y="322" font-size="56" font-weight="700">작은 움직임을 언어로,</text>
    <text x="600" y="404" font-size="56" font-weight="700">더 큰 가능성으로</text>
    <text x="600" y="540" font-size="26" font-weight="400">morspeak.com</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('../public/og-morspeak-ko-v1.png', import.meta.url)));
