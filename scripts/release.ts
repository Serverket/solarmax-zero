import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Parse arguments
const args = process.argv.slice(2);
const version = args[0];
const noteIndex = args.indexOf('--note');
const note = noteIndex !== -1 ? args[noteIndex + 1] : '';

if (!version) {
  console.error('❌ Error: Debes proveer una versión (ej. 1.7.0).');
  process.exit(1);
}

try {
  // 1. Update package.json version
  const pkgPath = path.resolve('package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ package.json actualizado a la versión ${version}`);

  // 2. Commit and Tag
  const commitMsg = note ? `Release v${version} - ${note}` : `Release v${version}`;
  
  // Add all changes (or just package.json depending on standard flow)
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  execSync(`git tag v${version}`, { stdio: 'inherit' });
  
  console.log(`🚀 Release v${version} creado con éxito.`);
} catch (error) {
  console.error('❌ Falló el release:', error);
  process.exit(1);
}
