import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import { copyFileSync } from 'fs';

const PROMO_DIR = path.resolve('promo/itch');
const ARTIFACT_DIR = '/home/skt/.gemini/antigravity-ide/brain/a7360034-b71f-471b-8015-281d3f58ad09';

async function run() {
  console.log('🚀 Starting Vite preview server for dynamic motion cover...');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'inherit' });

  await new Promise(r => setTimeout(r, 2000));

  try {
    console.log('🌐 Launching headless Chrome via puppeteer-core...');
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1260,1000',
        '--autoplay-policy=no-user-gesture-required'
      ],
      headless: true
    });

    const page = await browser.newPage();
    // Itch.io recommended 630x500 at 2x resolution: 1260x1000
    await page.setViewport({ width: 1260, height: 1000, deviceScaleFactor: 1 });

    console.log('🛸 Navigating to m_lvl6 (Fleet Command) with hidehud=true...');
    await page.goto('http://localhost:4173/?level=m_lvl6&autostart=true&hidehud=true', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    // Ensure canvas covers viewport seamlessly
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.objectFit = 'cover';
        canvas.style.width = '1260px';
        canvas.style.height = '1000px';
      }
    });

    console.log('⚡ Orchestrating dominant Red & Blue armada clash (with subtle green/yellow accents)...');
    await page.evaluate(() => {
      const api = (window as unknown as { 
        __solarmax?: { 
          launchFleets: (from: string[], to: string) => void;
          getPhysicsState: () => { planets: Array<{ id: string; owner: string; ships: number; x: number; y: number; radius: number }> };
        } 
      }).__solarmax;

      if (!api) return;

      const st1 = api.getPhysicsState();

      // Clean, easily readable composition with FEWER planets:
      // Only 3 visible focal bodies: Blue Citadel (left), Giant Mothership (center), Red Citadel (right)
      const p0 = st1.planets.find(p => p.id === 'p0'); // Blue
      const p1 = st1.planets.find(p => p.id === 'p1'); // Red
      const p2 = st1.planets.find(p => p.id === 'p2'); // Green
      const p3 = st1.planets.find(p => p.id === 'p3'); // Yellow
      const p4 = st1.planets.find(p => p.id === 'p4'); // Mothership

      // 1. Blue Homeworld on the left flank
      if (p0) {
        p0.x = 160;
        p0.y = 430;
        p0.radius = 36;
        p0.ships = 90;
      }

      // 2. Red Homeworld on the right flank
      if (p1) {
        p1.x = 1040;
        p1.y = 430;
        p1.radius = 36;
        p1.ships = 90;
      }

      // 3. Colossal Central Mothership (Objective)
      if (p4) {
        p4.x = 600;
        p4.y = 430;
        p4.radius = 88;
        p4.ships = 25;
      }

      // 4. Move all turrets completely offscreen so they don't clutter the scene
      ['p5', 'p6', 'p7', 'p8'].forEach(tid => {
        const t = st1.planets.find(p => p.id === tid);
        if (t) {
          t.x = -999;
          t.y = -999;
        }
      });

      // 5. Position Green & Yellow bases just off the bottom corners so their ships fly into view, but planets don't crowd the canvas
      if (p2) {
        p2.x = 120;
        p2.y = 860;
        p2.ships = 20;
      }
      if (p3) {
        p3.x = 1080;
        p3.y = 860;
        p3.ships = 20;
      }

      // WAVE 1 (t = 0.0s):
      // - Massive cross-screen invasion: Blue launches across to Red, Red launches across to Blue!
      // - Green & Yellow launch diagonal flanking wings towards the Mothership
      api.launchFleets(['p0'], 'p1'); // Blue fleet flies all the way across to the right
      api.launchFleets(['p1'], 'p0'); // Red fleet flies all the way across to the left
      api.launchFleets(['p2'], 'p4'); // Green squadron flies in towards Mothership
      api.launchFleets(['p3'], 'p4'); // Yellow squadron flies in towards Mothership

      // WAVE 2 (t = 0.9s): Direct assault into Mothership ring
      setTimeout(() => {
        const st2 = api.getPhysicsState();
        const p0_2 = st2.planets.find(p => p.id === 'p0');
        const p1_2 = st2.planets.find(p => p.id === 'p1');
        if (p0_2) p0_2.ships = 90;
        if (p1_2) p1_2.ships = 90;

        api.launchFleets(['p0', 'p1'], 'p4');
      }, 900);

      // WAVE 3 (t = 1.9s): Secondary massive cross-screen wave!
      setTimeout(() => {
        const st3 = api.getPhysicsState();
        const p0_3 = st3.planets.find(p => p.id === 'p0');
        const p1_3 = st3.planets.find(p => p.id === 'p1');
        const p2_3 = st3.planets.find(p => p.id === 'p2');
        const p3_3 = st3.planets.find(p => p.id === 'p3');

        if (p0_3) p0_3.ships = 85;
        if (p1_3) p1_3.ships = 85;
        if (p2_3) p2_3.ships = 14;
        if (p3_3) p3_3.ships = 14;

        api.launchFleets(['p0'], 'p1');
        api.launchFleets(['p1'], 'p0');
        api.launchFleets(['p2', 'p3'], 'p4');
      }, 1900);

      // WAVE 4 (t = 2.8s): Reinforcing assault into Mothership
      setTimeout(() => {
        const st4 = api.getPhysicsState();
        const p0_4 = st4.planets.find(p => p.id === 'p0');
        const p1_4 = st4.planets.find(p => p.id === 'p1');
        if (p0_4) p0_4.ships = 80;
        if (p1_4) p1_4.ships = 80;

        api.launchFleets(['p0', 'p1'], 'p4');
      }, 2800);

      // HOMELAND CITADEL DEFENSE (t = 3.4s):
      // Replenish home planet garrisons so both homeworlds feature active, glowing 3D orbital fighter rings
      setTimeout(() => {
        const st5 = api.getPhysicsState();
        const p0_5 = st5.planets.find(p => p.id === 'p0');
        const p1_5 = st5.planets.find(p => p.id === 'p1');
        if (p0_5) p0_5.ships = 40;
        if (p1_5) p1_5.ships = 40;
      }, 3400);
    });

    // Wait 3.9s for hundreds of ships to cross paths, laser crossfire and contrails to peak
    console.log('⏳ Waiting 3.9s for peak motion, cross-screen swarms and contrails...');
    await new Promise(r => setTimeout(r, 3900));

    // Inject thumbnail-optimized branding overlay
    await page.evaluate(() => {
      // Suppress any stray banners
      const banners = document.querySelectorAll('.glass-panel-glow-white, .fixed.bottom-0');
      banners.forEach(b => (b as HTMLElement).style.display = 'none');

      const overlay = document.createElement('div');
      overlay.id = 'cover-branding-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 1260px;
        height: 1000px;
        pointer-events: none;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        box-sizing: border-box;
        font-family: 'Orbitron', sans-serif;
        background: linear-gradient(180deg, rgba(5, 7, 14, 0.95) 0%, rgba(5, 7, 14, 0.85) 24%, rgba(5, 7, 14, 0.2) 38%, rgba(5, 7, 14, 0) 50%, rgba(5, 7, 14, 0.35) 100%);
      `;

      overlay.innerHTML = `
        <!-- Top Branding Header: Ultra-Legible at Small Thumbnail Size (200px - 300px) -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: 48px; width: 100%; max-width: 1150px;">
          
          <!-- Official Singularity SVG Logo -->
          <svg style="width: 98px; height: 98px; margin-bottom: 12px; filter: drop-shadow(0 0 25px rgba(0, 240, 255, 0.95)) drop-shadow(0 0 60px rgba(0, 240, 255, 0.65));" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#00f0ff" stroke-width="3.5" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0, 240, 255, 0.5)" stroke-width="1.8" stroke-dasharray="6,4" />
            <polygon points="15,85 52,52 85,15 48,48" fill="#ffffff" />
            <polygon points="15,15 52,48 85,85 48,52" fill="#ffffff" />
            <polygon points="15,85 52,52 85,15 48,48" fill="#00f0ff" opacity="0.5" />
          </svg>

          <!-- Main Title: Extra Massive (88px), Weight 900, High Contrast for Store Grid Thumbnails -->
          <h1 style="
            font-size: 88px;
            font-weight: 900;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            line-height: 1.0;
            margin: 0;
            color: #ffffff;
            background: linear-gradient(180deg, #ffffff 15%, #cffafe 55%, #00f0ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 4px 20px rgba(0,0,0,0.95)) drop-shadow(0 0 50px rgba(0, 240, 255, 0.95));
          ">
            SOLARMAX ZERO
          </h1>

          <!-- Punchy Bold Subtitle -->
          <div style="
            font-size: 19px;
            font-weight: 900;
            letter-spacing: 0.48em;
            text-transform: uppercase;
            color: #00f0ff;
            text-shadow: 0 0 18px rgba(0, 240, 255, 0.95), 0 2px 10px rgba(0,0,0,0.95);
            margin-top: 14px;
            margin-bottom: 16px;
          ">
            TACTICAL SPACE REAL-TIME STRATEGY
          </div>

          <!-- High-Contrast Accent Pill: Bold, Sharp and Punchy -->
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: rgba(8, 14, 28, 0.9);
            backdrop-filter: blur(14px);
            border: 1.5px solid rgba(0, 240, 255, 0.8);
            box-shadow: 0 0 35px rgba(0, 240, 255, 0.5), inset 0 0 15px rgba(0, 240, 255, 0.2);
            border-radius: 9999px;
            padding: 8px 32px;
          ">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #00f0ff; box-shadow: 0 0 12px #00f0ff;"></span>
            <span style="font-size: 13px; font-weight: 900; letter-spacing: 0.35em; text-transform: uppercase; color: #ffffff; text-shadow: 0 0 12px #00f0ff;">
              MOTHERSHIP ARMADA // 4-FACTION WARFARE
            </span>
          </div>

        </div>

        <!-- Bottom Sci-Fi Footer: Crisp & Elegant -->
        <div style="
          position: absolute;
          bottom: 30px;
          left: 56px;
          right: 56px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: rgba(255, 255, 255, 0.85);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          text-shadow: 0 2px 12px rgba(0,0,0,0.95);
        ">
          <div style="display: flex; align-items: center; gap: 8px; color: #00f0ff;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #00f0ff; box-shadow: 0 0 10px #00f0ff;"></span>
            <span>IN-GAME CANVAS ENGINE // 60 FPS</span>
          </div>
          <div style="text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);">PLAYABLE IN BROWSER // ITCH.IO RELEASE</div>
        </div>
      `;

      document.body.appendChild(overlay);
    });

    await new Promise(r => setTimeout(r, 600));
    const coverPath = path.join(PROMO_DIR, 'cover.jpg');
    await page.screenshot({ path: coverPath, quality: 98 });
    copyFileSync(coverPath, path.join(ARTIFACT_DIR, 'cover.jpg'));
    console.log('  ✅ Dynamic Motion Cover captured at: ' + coverPath);

    await browser.close();
    console.log('🎉 High-motion cover generated successfully!');
  } finally {
    preview.kill();
  }
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
