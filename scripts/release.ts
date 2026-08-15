import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Usage: bun run release 2.0.0 --note "This is a new feature"

const args = process.argv.slice(2);
const version = args[0];

if (!version || version.startsWith('--')) {
  console.error('Error: Please specify a version number as the first argument.');
  console.error('Example: bun run release 2.0.0 --note "Added new feature"');
  process.exit(1);
}

let note = '';
const noteIndex = args.indexOf('--note');
if (noteIndex !== -1 && args[noteIndex + 1]) {
  note = args[noteIndex + 1];
}

console.log(`🚀 Releasing version ${version}...`);
if (note) console.log(`📝 Note: ${note}`);

// 1. Run build to ensure stability BEFORE modifying any files
try {
  console.log(`⚙️  Building project...`);
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`✅ Build successful!`);
} catch (e) {
  console.error('❌ Build failed! Aborting release. No files were modified.');
  process.exit(1);
}

// 2. Update package.json
const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✅ Updated package.json version to ${version}`);

// 3. Update README.md
const readmePath = resolve(process.cwd(), 'README.md');
try {
  let readmeContent = readFileSync(readmePath, 'utf-8');
  // Update version badge
  readmeContent = readmeContent.replace(/badge\/version-[0-9.]+/, `badge/version-${version}`);
  writeFileSync(readmePath, readmeContent);
  console.log(`✅ Updated README.md version badge to ${version}`);
} catch(e) {
  console.warn(`⚠️ Could not update README.md`);
}

// 4. Update src/utils/version.ts
const versionPath = resolve(process.cwd(), 'src/utils/version.ts');
try {
  let versionContent = readFileSync(versionPath, 'utf-8');
  versionContent = versionContent.replace(/GAME_VERSION = '[0-9.]+';/, `GAME_VERSION = '${version}';`);
  writeFileSync(versionPath, versionContent);
  console.log(`✅ Updated src/utils/version.ts to ${version}`);
} catch (e) {
  console.warn(`⚠️ Could not update src/utils/version.ts`);
}

// 5. Git commit and tag
try {
  // Check if git is initialized
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

  execSync('git add .');
  const commitMsg = `Release v${version}${note ? ` - ${note}` : ''}`;
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  
  // Force delete existing tag locally just in case it exists, ignore errors
  try { execSync(`git tag -d v${version}`, { stdio: 'ignore' }); } catch (e) {}
  
  execSync(`git tag -a v${version} -m "${note || `Release v${version}`}"`, { stdio: 'inherit' });

  console.log(`✅ Git commit and tag (v${version}) created successfully!`);
} catch (e) {
  console.log(`⚠️ Git operations skipped or failed (perhaps no changes to commit).`);
}

console.log(`🎉 Release ${version} complete!`);
