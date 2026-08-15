import { mkdir } from 'fs/promises';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { get } from 'https';

const ALBUM_IDENTIFIER = 'StellardroneLightYears';
const BASE_URL = `https://archive.org/download/${ALBUM_IDENTIFIER}`;

const TRACKS = [
  { file: "01RedGiant.mp3", name: "Red Giant" },
  { file: "02Airglow.mp3", name: "Airglow" },
  { file: "03Eternity.mp3", name: "Eternity" },
  { file: "04LightYears.mp3", name: "Light Years" },
  { file: "05InTime.mp3", name: "In Time" },
  { file: "06CometHalley.mp3", name: "Comet Halley" },
  { file: "07ToTheGreatBeyond.mp3", name: "To The Great Beyond" },
  { file: "08TheDivineCosmos.mp3", name: "The Divine Cosmos" },
  { file: "09Penumbra.mp3", name: "Penumbra" },
  { file: "10Twilight.mp3", name: "Twilight" }
];

const TARGET_DIR = join(process.cwd(), 'public', 'audio');

import { existsSync } from 'fs';

async function downloadTrack(track: { file: string, name: string }) {
  const url = `${BASE_URL}/${track.file}`;
  const dest = join(TARGET_DIR, track.file);

  if (existsSync(dest)) {
    console.log(`Skipping: ${track.name} (Already exists)`);
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    console.log(`Downloading: ${track.name} from ${url}`);
    
    // Using native https to handle redirect or binary stream
    get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
         // Follow one redirect
         get(response.headers.location!, (res) => {
           const file = createWriteStream(dest);
           res.pipe(file);
           file.on('finish', () => { file.close(); resolve(); });
           file.on('error', reject);
         });
      } else if (response.statusCode === 200) {
        const file = createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
      } else {
        reject(new Error(`Failed to download ${track.name}: Status ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  await mkdir(TARGET_DIR, { recursive: true });
  console.log('Downloading Stellardrone OST...');
  
  for (const track of TRACKS) {
    try {
      await downloadTrack(track);
      console.log(`✅ Finished: ${track.name}`);
    } catch (err) {
      console.error(`❌ Error downloading ${track.name}:`, err);
    }
  }
  
  console.log('\nMusic download complete!');
}

main();
