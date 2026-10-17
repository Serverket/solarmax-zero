import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve('.');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const OUTPUT_ZIP = path.join(RELEASE_DIR, 'solarmax-zero-itch.zip');

if (!existsSync(RELEASE_DIR)) {
  mkdirSync(RELEASE_DIR, { recursive: true });
}

const pkgPath = path.join(ROOT_DIR, 'package.json');
const pkgVersion = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf-8')).version : 'unknown';

console.log(`🚀 [ITCH.IO BUILD & PACKAGING PIPELINE - v${pkgVersion}]`);
console.log('========================================');

// 1. Compile fresh production build
console.log('📦 Step 1: Compiling production build with relative paths (base: "./")...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT_DIR });
} catch (error) {
  console.error('❌ Build failed! Aborting packaging.', error);
  process.exit(1);
}

// 2. Pre-flight Verification Matrix
console.log('\n🔍 Step 2: Running Pre-flight Quality & Compatibility Matrix...');

const indexHtmlPath = path.join(DIST_DIR, 'index.html');
if (!existsSync(indexHtmlPath)) {
  console.error('❌ ERROR: dist/index.html not found!');
  process.exit(1);
}

const htmlContent = readFileSync(indexHtmlPath, 'utf-8');

// Check for dangerous absolute root paths like src="/assets or href="/assets
const absoluteRootRegex = /(src|href)=["']\/(?!\/)[^"']+/g;
const matches = htmlContent.match(absoluteRootRegex) || [];

// Filter out benign scheme-relative or known harmless if any
const invalidMatches = matches.filter(m => !m.includes('http') && !m.includes('//'));

if (invalidMatches.length > 0) {
  console.warn('⚠️ WARNING: Found absolute paths in index.html that may fail in itch.io iframe:');
  invalidMatches.forEach(m => console.warn(`   - ${m}`));
} else {
  console.log('  ✅ Asset Paths: 100% relative (No absolute root "/" references in index.html)');
}

// Check audio directory
const distAudioDir = path.join(DIST_DIR, 'audio');
if (existsSync(distAudioDir)) {
  console.log('  ✅ Audio Assets: Present in dist/audio/');
} else {
  console.warn('  ⚠️ Warning: dist/audio/ not detected.');
}

// 3. Compress into solarmax-zero-itch.zip
console.log('\n🗜️ Step 3: Generating itch.io zip package with root-level index.html...');

if (existsSync(OUTPUT_ZIP)) {
  unlinkSync(OUTPUT_ZIP);
}

try {
  // Zip contents of dist directly into solarmax-zero-itch.zip (no wrapper folder)
  execSync(`cd dist && zip -r -q "${OUTPUT_ZIP}" .`, { stdio: 'inherit', cwd: ROOT_DIR });
} catch (error) {
  console.error('❌ Zip creation failed:', error);
  process.exit(1);
}

// 4. Validate ZIP contents
console.log('\n🔎 Step 4: Validating ZIP structure...');
try {
  const zipListing = execSync(`unzip -l "${OUTPUT_ZIP}"`, { encoding: 'utf-8' });
  const hasRootIndexHtml = /^\s*\d+\s+[\d-]+\s+[\d:]+\s+index\.html\s*$/m.test(zipListing) || 
                           zipListing.split('\n').some(line => line.trim().endsWith('index.html') && !line.includes('/index.html'));

  if (hasRootIndexHtml) {
    console.log('  ✅ ZIP Structure: "index.html" is located strictly at the archive ROOT.');
  } else {
    console.error('  ❌ ZIP Structure Invalid: "index.html" is not at root level!');
    process.exit(1);
  }

  const stat = statSync(OUTPUT_ZIP);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`  ✅ Package Size: ${sizeMb} MB (${stat.size.toLocaleString()} bytes)`);
  console.log(`  ✅ Archive Path: ${OUTPUT_ZIP}`);

  console.log('\n========================================');
  console.log('🎉 ITCH.IO RELEASE PACKAGE READY!');
  console.log('Upload "solarmax-zero-itch.zip" directly in your itch.io project dashboard.');
  console.log('========================================\n');
} catch (error) {
  console.error('❌ ZIP validation failed:', error);
  process.exit(1);
}
