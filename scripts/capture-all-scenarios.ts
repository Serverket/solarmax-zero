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
    'cover-2.jpg',
    'banner.png',
    'background-stars.png',
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

    await browser.close();
    console.log('🎉 Standard gameplay screenshots (1 to 5) generated successfully! (cover.jpg kept intact)');
  } finally {
    preview.kill();
  }
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
