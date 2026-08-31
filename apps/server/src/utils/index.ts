import path from 'path';
import fs from 'fs';

export const configPath = path.resolve(__dirname, '../../config.json');

export function hasConfigFile() {
  return fs.existsSync(configPath);
}
