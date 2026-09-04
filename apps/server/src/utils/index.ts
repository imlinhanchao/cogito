import path from 'path';
import fs from 'fs';

export const configPath = path.resolve(__dirname, '../../config.json');

export function hasConfigFile() {
  return fs.existsSync(configPath);
}

export function omit(obj: Record<string, any>, keys: string[]) {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
