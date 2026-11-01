import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { resolveAssetUrl, generateProceduralBiomeCanvas } from '../src/utils/assets';

describe('1. Universal Asset & Texture Resolution Engine', () => {
  it('should resolve relative asset paths safely in root URL environment', () => {
    const url = resolveAssetUrl('textures/small.png');
    expect(url).toContain('textures/small.png');
    expect(url.startsWith('http://') || url.startsWith('https://') || url.startsWith('./')).toBe(true);
  });

  it('should resolve correctly even if path starts with ./ or /', () => {
    const url1 = resolveAssetUrl('./textures/ice.png');
    const url2 = resolveAssetUrl('/textures/ice.png');
    const url3 = resolveAssetUrl('textures/ice.png');
    
    expect(url1).toContain('textures/ice.png');
    expect(url2).toContain('textures/ice.png');
    expect(url3).toContain('textures/ice.png');
  });

  it('should generate valid 512x512 procedural canvas for all 12 biomes', () => {
    const biomes = [
      'small', 'medium', 'large', 'ice', 'desert', 'volcanic',
      'oceanic', 'toxic', 'magma', 'crystalline', 'neptune', 'barren'
    ];

    const originalDoc = globalThis.document;
    if (!globalThis.document) {
      // @ts-expect-error mock doc for bun test environment
      globalThis.document = {
        createElement: (tag: string) => {
          if (tag === 'canvas') {
            return {
              width: 0,
              height: 0,
              getContext: () => ({
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                fillRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                ellipse: () => {},
                moveTo: () => {},
                lineTo: () => {},
                closePath: () => {}
              })
            };
          }
          return {};
        }
      };
    }

    biomes.forEach(biome => {
      const c = generateProceduralBiomeCanvas(biome);
      expect(c.width).toBe(512);
      expect(c.height).toBe(512);
    });

    if (originalDoc === undefined) {
      // @ts-expect-error restore environment
      delete globalThis.document;
    }
  });

  it('should verify all 12 high-resolution PNG texture files exist with valid PNG magic headers', () => {
    const biomes = [
      'small.png', 'medium.png', 'large.png', 'ice.png', 'desert.png', 'volcanic.png',
      'oceanic.png', 'toxic.png', 'magma.png', 'crystalline.png', 'neptune.png', 'barren.png'
    ];

    const texturesDir = path.resolve('public/textures');
    expect(existsSync(texturesDir)).toBe(true);

    biomes.forEach(file => {
      const fullPath = path.join(texturesDir, file);
      expect(existsSync(fullPath)).toBe(true);

      const buf = readFileSync(fullPath);
      expect(buf.length).toBeGreaterThan(50 * 1024); // at least 50KB

      // PNG magic number: 0x89, 0x50, 0x4E, 0x47
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4E);
      expect(buf[3]).toBe(0x47);
    });
  });

  it('should verify all ambient soundtrack OGG files exist with valid OggS headers', () => {
    const tracks = [
      '01RedGiant.ogg', '02Airglow.ogg', '03Eternity.ogg',
      '06CometHalley.ogg', '07ToTheGreatBeyond.ogg', '08TheDivineCosmos.ogg', '09Penumbra.ogg'
    ];

    const audioDir = path.resolve('public/audio');
    expect(existsSync(audioDir)).toBe(true);

    tracks.forEach(file => {
      const fullPath = path.join(audioDir, file);
      expect(existsSync(fullPath)).toBe(true);

      const buf = readFileSync(fullPath);
      expect(buf.length).toBeGreaterThan(1 * 1024 * 1024); // > 1MB

      // OGG magic header: 'O', 'g', 'g', 'S'
      expect(String.fromCharCode(buf[0], buf[1], buf[2], buf[3])).toBe('OggS');
    });
  });
});
