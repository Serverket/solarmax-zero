import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync, mkdirSync, readdirSync, unlinkSync, copyFileSync } from 'fs';

const PROMO_DIR = path.resolve('promo/itch');
if (!existsSync(PROMO_DIR)) {
  mkdirSync(PROMO_DIR, { recursive: true });
}

// Artifact directory for Antigravity IDE inspection
const ARTIFACT_DIR = '/home/skt/.gemini/antigravity-ide/brain/a7360034-b71f-471b-8015-281d3f58ad09';

// Clean up old legacy/redundant screenshots
function cleanOldScreenshots() {
  console.log('🧹 Cleaning old and redundant screenshot files in promo/itch/...');
  const allowed = new Set([
    'cover.jpg',
    'screenshot-1.jpg',
    'screenshot-2.jpg',
    'screenshot-3.jpg',
    'screenshot-4.jpg',
    'screenshot-5.jpg'
  ]);

  const files = readdirSync(PROMO_DIR);
  for (const f of files) {
    if (!allowed.has(f)) {
      console.log(`  🗑️ Removing old file: ${f}`);
      unlinkSync(path.join(PROMO_DIR, f));
    }
  }
}

async function run() {
  cleanOldScreenshots();

  console.log('🚀 Starting Vite preview server...');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'inherit' });

  // Give server 2s to spin up
  await new Promise(r => setTimeout(r, 2000));

  try {
    console.log('🌐 Launching headless Chrome via puppeteer-core...');
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1200,800',
        '--autoplay-policy=no-user-gesture-required'
      ],
      headless: true
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

    const suppressBanner = async () => {
      await page.evaluate(() => {
        const banners = document.querySelectorAll('.glass-panel-glow-white, .fixed.bottom-0');
        banners.forEach(b => {
          if (b.textContent && (b.textContent.includes('Instalar') || b.textContent.includes('Install'))) {
            (b as HTMLElement).style.display = 'none';
          }
        });
      });
    };

    // ==========================================
    // CAPTURE 1: The 1v1 Classic Tactical Duel (Level 1: First Contact)
    // ==========================================
    console.log('⚔️ [1/5] Capturing 1v1 Tactical Duel (Level 1: First Contact)...');
    await page.goto('http://localhost:4173/?level=lvl1&autostart=true', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
    await suppressBanner();

    // Launch player fleet from p0 to enemy p1
    await page.evaluate(() => {
      const api = (window as unknown as { __solarmax?: { launchFleets: (from: string[], to: string) => void } }).__solarmax;
      if (api) {
        api.launchFleets(['p0'], 'p1');
      }
    });

    // Wait 3.2s for mid-flight duel in center
    await new Promise(r => setTimeout(r, 3200));
    await suppressBanner();
    const sc1Path = path.join(PROMO_DIR, 'screenshot-1.jpg');
    await page.screenshot({ path: sc1Path, quality: 95 });
    copyFileSync(sc1Path, path.join(ARTIFACT_DIR, 'screenshot-1.jpg'));
    console.log('  ✅ Screenshot 1 (1v1 Duel) captured.');

    // ==========================================
    // CAPTURE 2: Ultra Messy 5-Faction War (Level 32: Chaos)
    // ==========================================
    console.log('💥 [2/5] Capturing Ultra-Messy 5-Faction War (Level 32: Chaos)...');
    await page.goto('http://localhost:4173/?level=lvl32&autostart=true', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
    await suppressBanner();

    // Player attacks multiple neutral and enemy planets to trigger multi-vector chaos
    await page.evaluate(() => {
      const api = (window as unknown as { __solarmax?: { launchFleets: (from: string[], to: string) => void } }).__solarmax;
      if (api) {
        api.launchFleets(['p0'], 'p5');
        setTimeout(() => {
          api.launchFleets(['p0'], 'p9');
        }, 700);
      }
    });

    // Wait 4.2s for all 5 factions to clash across 11 planets
    await new Promise(r => setTimeout(r, 4200));
    await suppressBanner();
    const sc2Path = path.join(PROMO_DIR, 'screenshot-2.jpg');
    await page.screenshot({ path: sc2Path, quality: 95 });
    copyFileSync(sc2Path, path.join(ARTIFACT_DIR, 'screenshot-2.jpg'));
    console.log('  ✅ Screenshot 2 (5-Faction Chaos) captured.');

    // ==========================================
    // CAPTURE 3: All-out Pitch Mothership Battle ('Fleet Command' m_lvl6)
    // ==========================================
    console.log('🛸 [3/5] Capturing All-out Mothership Battle (m_lvl6: Fleet Command)...');
    await page.goto('http://localhost:4173/?level=m_lvl6&autostart=true', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
    await suppressBanner();

    await page.evaluate(() => {
      const api = (window as unknown as { __solarmax?: { launchFleets: (from: string[], to: string) => void } }).__solarmax;
      if (api) {
        api.launchFleets(['p0'], 'p4');
        setTimeout(() => {
          api.launchFleets(['p0'], 'p7');
        }, 800);
      }
    });

    // Wait 3.8s for 4 factions to swarm the center Mothership and turrets with laser crossfire
    await new Promise(r => setTimeout(r, 3800));
    await suppressBanner();
    const sc3Path = path.join(PROMO_DIR, 'screenshot-3.jpg');
    await page.screenshot({ path: sc3Path, quality: 95 });
    copyFileSync(sc3Path, path.join(ARTIFACT_DIR, 'screenshot-3.jpg'));
    console.log('  ✅ Screenshot 3 (Mothership Campal) captured.');

    // ==========================================
    // CAPTURE 4: Real Campaign & Sector Map Navigation Interface
    // ==========================================
    console.log('🗺️ [4/5] Capturing Real Sector Map & Campaign Interface...');
    await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => {
      localStorage.setItem('solarmax_unlocked_level', '36');
      localStorage.setItem('solarmax_mothership_unlocked', 'true');
      localStorage.setItem('solarmax_last_played_level', 'm_lvl6');
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 1200));
    await suppressBanner();

    const sc4Path = path.join(PROMO_DIR, 'screenshot-4.jpg');
    await page.screenshot({ path: sc4Path, quality: 95 });
    copyFileSync(sc4Path, path.join(ARTIFACT_DIR, 'screenshot-4.jpg'));
    console.log('  ✅ Screenshot 4 (Galaxy Map) captured.');

    // ==========================================
    // CAPTURE 5: Hyperspace Warp Portals (Level 34: Warp Storm)
    // ==========================================
    console.log('🌀 [5/5] Capturing Hyperspace Warp Storm (Level 34)...');
    await page.goto('http://localhost:4173/?level=lvl34&autostart=true', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
    await suppressBanner();

    await page.evaluate(() => {
      const api = (window as unknown as { __solarmax?: { launchFleets: (from: string[], to: string) => void } }).__solarmax;
      if (api) {
        api.launchFleets(['p0'], 'p6');
      }
    });

    await new Promise(r => setTimeout(r, 3500));
    await suppressBanner();
    const sc5Path = path.join(PROMO_DIR, 'screenshot-5.jpg');
    await page.screenshot({ path: sc5Path, quality: 95 });
    copyFileSync(sc5Path, path.join(ARTIFACT_DIR, 'screenshot-5.jpg'));
    console.log('  ✅ Screenshot 5 (Warp Storm) captured.');

    // ==========================================
    // CAPTURE COVER: MAXIMUM THUMBNAIL-LEGIBILITY MOTHERSHIP CAMPAL COVER
    // ==========================================
    console.log('🎨 Generating High-Impact, Thumbnail-Legible Mothership Campal Cover...');
    // Set exact Itch.io 630x500 ratio at 2x resolution: 1260 x 1000
    await page.setViewport({ width: 1260, height: 1000, deviceScaleFactor: 1 });

    // Open m_lvl6 with hidehud=true so no HUD bars clash!
    await page.goto('http://localhost:4173/?level=m_lvl6&autostart=true&hidehud=true', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));

    // Ensure canvas covers viewport seamlessly with zero letterboxing
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.objectFit = 'cover';
        canvas.style.width = '1260px';
        canvas.style.height = '1000px';
      }
    });

    // Launch fleet waves from player p0 to center Mothership p4 and Turret p7
    await page.evaluate(() => {
      const api = (window as unknown as { __solarmax?: { launchFleets: (from: string[], to: string) => void } }).__solarmax;
      if (api) {
        api.launchFleets(['p0'], 'p4');
        setTimeout(() => {
          api.launchFleets(['p0'], 'p7');
        }, 700);
      }
    });

    // Wait 3.6s for all 4 factions to actively clash around the central Mothership and Turrets
    await new Promise(r => setTimeout(r, 3600));

    // Inject high-impact, thumbnail-optimized overlay
    await page.evaluate(() => {
      // Suppress any stray banners
      const banners = document.querySelectorAll('.glass-panel-glow-white, .fixed.bottom-0');
      banners.forEach(b => (b as HTMLElement).style.display = 'none');

      // Create Cover Branding Container
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
    console.log('  ✅ High-Impact Mothership Campal Cover captured at: ' + coverPath);

    await browser.close();
    console.log('🎉 Standard screens and high-impact thumbnail cover generated successfully!');
  } finally {
    preview.kill();
  }
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
