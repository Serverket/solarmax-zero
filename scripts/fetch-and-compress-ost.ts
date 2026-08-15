import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TRACKS = [
  { file: "01RedGiant.ogg", search: "Stellardrone - Red Giant" },
  { file: "02Airglow.ogg", search: "Stellardrone - Airglow" },
  { file: "03Eternity.ogg", search: "Stellardrone - Eternity" },
  { file: "04LightYears.ogg", search: "Stellardrone - Light Years" },
  { file: "05InTime.ogg", search: "Stellardrone - In Time" },
  { file: "06CometHalley.ogg", search: "Stellardrone - Comet Halley" },
  { file: "07ToTheGreatBeyond.ogg", search: "Stellardrone - To The Great Beyond" },
  { file: "08TheDivineCosmos.ogg", search: "Stellardrone - The Divine Cosmos" },
  { file: "09Penumbra.ogg", search: "Stellardrone - Penumbra" },
  { file: "10Twilight.ogg", search: "Stellardrone - Twilight" }
];

const TARGET_DIR = join(process.cwd(), 'public', 'audio');

function main() {
  if (!existsSync(TARGET_DIR)) {
    mkdirSync(TARGET_DIR, { recursive: true });
  }

  console.log('Iniciando descarga y súper-compresión a formato OGG (Vorbis)...');
  console.log('Asegúrate de tener yt-dlp y ffmpeg instalados en tu sistema.\n');

  for (const track of TRACKS) {
    const dest = join(TARGET_DIR, track.file);

    if (existsSync(dest)) {
      console.log(`✅ Skipping: ${track.file} (Ya existe)`);
      continue;
    }

    console.log(`⏳ Downloading & Compressing: ${track.search} -> ${track.file}`);
    try {
      // Usamos ytsearch1 para encontrar el primer resultado, extraer audio, pasarlo a ogg y comprimir a quality 0 (~64kbps)
      const command = `yt-dlp -x --audio-format vorbis --audio-quality 0 "ytsearch1:${track.search}" -o "${dest.replace('.ogg', '.%(ext)s')}"`;
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Finalizado: ${track.file}\n`);
    } catch (err) {
      console.error(`❌ Error al procesar ${track.file}:`, err);
    }
  }

  console.log('¡Proceso completado! Los archivos OGG ya están integrados en el proyecto.');
}

main();
