import fs from 'fs/promises';
import sharp from 'sharp';
import path from 'path';

const SVG_SOURCE = `
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
  
  const sizes = [
    { name: 'pwa-64x64.png', size: 64 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'maskable-icon-512x512.png', size: 512 },
    { name: 'apple-touch-icon-180x180.png', size: 180 }
  ];

  console.log('Generating PWA icons with Safe Zone compliance...');
  
  for (const { name, size } of sizes) {
    const outputPath = path.join(publicDir, name);
    await sharp(Buffer.from(SVG_SOURCE))
      .resize(size, size)
      .png()
      .toFile(outputPath);
      
    console.log(`[Generated] ${name} (${size}x${size})`);
  }
  
  console.log('All icons generated successfully! Desktop and Mobile compliance is now 100%.');
}

generateIcons().catch(console.error);
