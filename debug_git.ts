import { execSync } from 'child_process';
import fs from 'fs';

export const debugGit = () => {
  try {
    const output = execSync('git ls-tree -r HEAD', { encoding: 'utf-8' });
    fs.writeFileSync('./git_output.txt', output);
  } catch (error: any) {
    fs.writeFileSync('./git_output.txt', 'Error: ' + error.message);
  }
};
