import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Parse arguments
const args = process.argv.slice(2);
const rawVersion = args[0];
const noteIndex = args.indexOf('--note');
const note = noteIndex !== -1 ? args[noteIndex + 1] : '';

if (!rawVersion) {
  console.error('❌ Error: You must provide a version (e.g., 1.9.4).');
  console.error('Usage: npm run release <version> [--note "release notes"]');
  process.exit(1);
}

// Strip leading 'v' if user accidentally typed 'v1.9.4'
const version = rawVersion.startsWith('v') ? rawVersion.slice(1) : rawVersion;

// Validate semantic version format (e.g. 1.9.4 or 1.9.4-beta.1)
if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version)) {
  console.error(`❌ Error: "${rawVersion}" is not a valid semantic version (expected format: X.Y.Z).`);
  process.exit(1);
}

const pkgPath = path.resolve('package.json');
const originalPkgContent = readFileSync(pkgPath, 'utf-8');

try {
  // 1. Guard check: Ensure tag does not already exist
  const existingTags = execSync('git tag -l', { encoding: 'utf-8' })
    .split('\n')
    .map(t => t.trim())
    .filter(Boolean);

  if (existingTags.includes(`v${version}`)) {
    console.error(`❌ Error: Git tag v${version} already exists. Increment the version to release.`);
    process.exit(1);
  }

  // 2. Update package.json version
  const pkg = JSON.parse(originalPkgContent);
  const previousVersion = pkg.version;
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ Version bumped: v${previousVersion} -> v${version}`);

  // 3. Generate Itch.io Release Package with verified relative paths & root index.html
  console.log(`\n📦 Generating Itch.io package for v${version}...`);
  // Use bun if available, otherwise fallback to npm
  const runner = typeof (process as unknown as { versions: { bun?: string } }).versions?.bun !== 'undefined' ? 'bun' : 'npm';
  const packCmd = runner === 'bun' ? 'bun run scripts/package-itch.ts' : 'npm run build:itch';
  execSync(packCmd, { stdio: 'inherit' });

  // 4. Stage, Commit, and Tag
  const commitMsg = note ? `Release v${version} - ${note}` : `Release v${version}`;
  console.log(`\n📝 Staging release commit: "${commitMsg}"...`);
  execSync('git add .', { stdio: 'inherit' });

  // Guard against clean working directory error
  try {
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  } catch {
    console.log('ℹ️ No extra file changes to commit beyond version bump.');
  }

  execSync(`git tag v${version}`, { stdio: 'inherit' });
  console.log(`🏷️ Git tag v${version} created.`);

  // 5. Push to remote repository (Triggers Vercel Deploy)
  console.log('\n☁️ Pushing to GitHub (disparando Vercel deployment)...');
  execSync('git push origin HEAD', { stdio: 'inherit' });
  execSync(`git push origin v${version}`, { stdio: 'inherit' });

  console.log(`\n========================================`);
  console.log(`🎉 RELEASE v${version} COMPLETED SUCCESSFULLY!`);
  console.log(`🌐 Vercel Web Deployment: Triggered via GitHub push & tag.`);
  console.log(`🎮 Itch.io Standalone Package: release/solarmax-zero-itch.zip ready.`);
  console.log(`========================================\n`);
} catch (error) {
  console.error('\n❌ Release failed! Rolling back package.json...');
  try {
    writeFileSync(pkgPath, originalPkgContent);
    console.log('🔄 package.json restored to original version.');
  } catch (rollbackErr) {
    console.error('Failed to rollback package.json:', rollbackErr);
  }
  console.error('Reason:', error);
  process.exit(1);
}
