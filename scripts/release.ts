import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Parse arguments
const args = process.argv.slice(2);
const version = args[0];
const noteIndex = args.indexOf('--note');
const note = noteIndex !== -1 ? args[noteIndex + 1] : '';

if (!version) {
  console.error('❌ Error: You must provide a version (e.g., 1.7.0).');
  process.exit(1);
}

try {
  // 1. Update package.json version
  const pkgPath = path.resolve('package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ package.json updated to version ${version}`);

  // 2. Commit and Tag
  const commitMsg = note ? `Release v${version} - ${note}` : `Release v${version}`;
  
  // Add all changes (or just package.json depending on standard flow)
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  execSync(`git tag v${version}`, { stdio: 'inherit' });
  
  // 3. Push to remote repository (Triggers Vercel Deploy)
  console.log('☁️ Pushing to GitHub to trigger Vercel deployment...');
  execSync('git push origin HEAD', { stdio: 'inherit' });
  execSync('git push origin --tags', { stdio: 'inherit' });
  
  console.log(`🚀 Release v${version} created successfully.`);
} catch (error) {
  console.error('❌ Release failed:', error);
  process.exit(1);
}
