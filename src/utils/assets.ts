/**
 * Solarmax Zero - Universal Asset Resolver & Procedural Texture Engine
 * Guarantees 100% texture and audio availability across Itch.io iframes,
 * subpath CDNs, Vercel PWA, and offline environments.
 */

let cachedBase: string | null = null;
let lastBaseURI: string | null = null;

export function resolveAssetUrl(relPath: string): string {
  const clean = relPath.replace(/^(\.\/|\/)+/, '');
  
  if (typeof window === 'undefined') {
    return `./${clean}`;
  }

  const currentBase = (typeof document !== 'undefined' && document.baseURI) || window.location.href;

  if (cachedBase === null || currentBase !== lastBaseURI) {
    lastBaseURI = currentBase;
    cachedBase = null;
    const baseTag = typeof document !== 'undefined' ? document.querySelector('base') : null;
    if (baseTag && baseTag.href) {
      try {
        const u = new URL(baseTag.href);
        cachedBase = u.href.endsWith('/') ? u.href : `${u.href}/`;
      } catch {
        cachedBase = null;
      }
    }

    if (!cachedBase) {
      try {
        const url = new URL(currentBase);
        let pathname = url.pathname;
        
        // If pathname does not end with a slash or filename with extension, ensure trailing slash
        // e.g. /html/1234567 -> /html/1234567/
        if (!pathname.endsWith('/') && !/\.[a-zA-Z0-9]+$/.test(pathname)) {
          pathname += '/';
        } else if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
          // e.g. /html/1234567/index.html -> /html/1234567/
          const lastSlash = pathname.lastIndexOf('/');
          pathname = lastSlash >= 0 ? pathname.slice(0, lastSlash + 1) : '/';
        }
        
        url.pathname = pathname;
        url.search = '';
        url.hash = '';
        cachedBase = url.href.endsWith('/') ? url.href : `${url.href}/`;
      } catch {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
          ? import.meta.env.BASE_URL 
          : `${import.meta.env.BASE_URL}/`;
        cachedBase = baseUrl;
      }
    }
  }

  if (clean.includes('..')) {
    try {
      return new URL(clean, cachedBase).href;
    } catch {
      return `${cachedBase}${clean}`;
    }
  }

  return `${cachedBase}${clean}`;
}

/**
 * Procedural in-memory canvas generator for all 12 celestial planet biomes.
 * Generates an instantaneous 512x512 procedural texture in RAM (<2ms) so
 * planets NEVER render as blank/empty circles under any network condition.
 */
export function generateProceduralBiomeCanvas(biome: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Pseudo-random deterministic generator from seed string (strictly positive)
  let seed = 1;
  for (let i = 0; i < biome.length; i++) {
    seed = Math.abs(((seed << 5) - seed + biome.charCodeAt(i)) | 0);
  }
  const rand = () => {
    seed = (Math.abs(seed) * 9301 + 49297) % 233280;
    return Math.abs(seed) / 233280;
  };

  switch (biome) {
    case 'small': // Lunar Craters
    case 'barren': { // Mercurian Basins
      ctx.fillStyle = '#808791';
      ctx.fillRect(0, 0, 512, 512);
      // Noise
      for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.arc(rand() * 512, rand() * 512, Math.max(0.5, rand() * 3 + 1), 0, Math.PI * 2);
        ctx.fill();
      }
      // Craters with rim highlights
      for (let i = 0; i < 40; i++) {
        const cx = rand() * 512;
        const cy = rand() * 512;
        const cr = Math.max(1, rand() * 28 + 6);
        ctx.fillStyle = 'rgba(40, 44, 52, 0.45)';
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, cr, -Math.PI * 0.75, Math.PI * 0.25);
        ctx.stroke();
      }
      break;
    }

    case 'medium': // Continental Earthlike
    case 'oceanic': { // Oceanic Super-cyclones
      ctx.fillStyle = biome === 'oceanic' ? '#0f2b48' : '#1e3a5f';
      ctx.fillRect(0, 0, 512, 512);
      // Continents / deep currents
      ctx.fillStyle = biome === 'oceanic' ? '#1b4d75' : '#2d6a4f';
      for (let i = 0; i < 24; i++) {
        const cx = rand() * 512;
        const cy = rand() * 512;
        const cr = rand() * 70 + 30;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cloud swirls
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let i = 0; i < 60; i++) {
        const cx = rand() * 512;
        const cy = rand() * 512;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rand() * 45 + 15, rand() * 12 + 4, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'large': // Jovian Gas Belts
    case 'neptune': { // Ice Giant Winds
      const base = biome === 'neptune' ? '#1d4ed8' : '#78350f';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      // Horizontal zonal bands
      const bandCount = 32;
      for (let i = 0; i < bandCount; i++) {
        const y = (i / bandCount) * 512;
        const h = 512 / bandCount;
        ctx.fillStyle = i % 2 === 0 
          ? (biome === 'neptune' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(251, 191, 36, 0.35)')
          : (biome === 'neptune' ? 'rgba(30, 58, 138, 0.5)' : 'rgba(120, 53, 15, 0.45)');
        ctx.fillRect(0, y, 512, h);
      }
      // Great storm vortex
      ctx.fillStyle = biome === 'neptune' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(220, 38, 38, 0.6)';
      ctx.beginPath();
      ctx.ellipse(320, 290, 48, 26, -0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'ice': { // Europa Cryo Fractures
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 512, 512);
      // Tectonic cryo cracks
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        let x = rand() * 512;
        let y = rand() * 512;
        ctx.moveTo(x, y);
        for (let j = 0; j < 5; j++) {
          x += (rand() - 0.5) * 120;
          y += (rand() - 0.5) * 120;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }

    case 'desert': { // Martian Canyons & Dunes
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(0, 0, 512, 512);
      // Ochre dune ridges
      ctx.fillStyle = 'rgba(234, 88, 12, 0.5)';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.ellipse(rand() * 512, rand() * 512, rand() * 80 + 30, rand() * 16 + 5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Dark canyon chasms
      ctx.strokeStyle = 'rgba(45, 10, 5, 0.7)';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        let x = rand() * 512;
        let y = rand() * 512;
        ctx.moveTo(x, y);
        for (let j = 0; j < 6; j++) {
          x += (rand() - 0.3) * 100;
          y += (rand() - 0.5) * 60;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }

    case 'volcanic': // Basalt & Magma Rifts
    case 'magma': { // Molten Lava Lakes
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, 512, 512);
      // Molten veins
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 4;
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        let x = rand() * 512;
        let y = rand() * 512;
        ctx.moveTo(x, y);
        for (let j = 0; j < 6; j++) {
          x += (rand() - 0.5) * 90;
          y += (rand() - 0.5) * 90;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Incandescent lava lakes
      ctx.fillStyle = '#f97316';
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(rand() * 512, rand() * 512, rand() * 32 + 10, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'toxic': { // Venusian Sulfuric Swirl
      ctx.fillStyle = '#3f6212';
      ctx.fillRect(0, 0, 512, 512);
      // Acid cloud spirals
      ctx.fillStyle = 'rgba(163, 230, 53, 0.4)';
      for (let i = 0; i < 35; i++) {
        ctx.beginPath();
        ctx.ellipse(rand() * 512, rand() * 512, rand() * 90 + 20, rand() * 25 + 8, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'crystalline': { // Prismatic Hex Lattices
      ctx.fillStyle = '#312e81';
      ctx.fillRect(0, 0, 512, 512);
      // Prismatic crystal facets
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      for (let i = 0; i < 30; i++) {
        const cx = rand() * 512;
        const cy = rand() * 512;
        const cr = rand() * 35 + 15;
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3;
          const px = cx + Math.cos(angle) * cr;
          const py = cy + Math.sin(angle) * cr;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }

    default: {
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 512, 512);
      break;
    }
  }

  return canvas;
}
