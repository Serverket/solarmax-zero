import fs from 'fs/promises';
import sharp from 'sharp';
import path from 'path';

// Standard layout (Logo scaled to 90%, solid background)
const SVG_STANDARD = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <rect width="100" height="100" fill="#0b0f19" />
  <g transform="translate(5, 5) scale(0.9)">
    <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff" stroke-width="2.5" />
    <polygon points="15,85 52,52 85,15 48,48" fill="#ffffff" />
    <polygon points="15,15 52,48 85,85 48,52" fill="#ffffff" />
  </g>
</svg>
`;

// Maskable layout (Logo scaled to 70%, centered in Safe Zone)
const SVG_MASKABLE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <rect width="100" height="100" fill="#0b0f19" />
  <g transform="translate(15, 15) scale(0.7)">
    <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff" stroke-width="2.5" />
    <polygon points="15,85 52,52 85,15 48,48" fill="#ffffff" />
    <polygon points="15,15 52,48 85,85 48,52" fill="#ffffff" />
  </g>
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(process.cwd(), 'public');
  
  const standardSizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon.ico', size: 32 }, // Browsers support PNG inside .ico flawlessly
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];

  const maskableSizes = [
    { name: 'android-chrome-192x192-m.png', size: 192 },
    { name: 'android-chrome-512x512-m.png', size: 512 },
  ];

  console.log('Generating Standard Icons...');
  for (const { name, size } of standardSizes) {
    const outputPath = path.join(publicDir, name);
    await sharp(Buffer.from(SVG_STANDARD))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`[Generated] ${name} (${size}x${size})`);
  }

  console.log('Generating Maskable Icons (Safe Zone 40%)...');
  for (const { name, size } of maskableSizes) {
    const outputPath = path.join(publicDir, name);
    await sharp(Buffer.from(SVG_MASKABLE))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`[Generated] ${name} (${size}x${size})`);
  }
  
  console.log('All icons generated successfully following the hermon-radio standard.');
}

generateIcons().catch(console.error);
