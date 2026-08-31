import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ConfigData } from 'src/config/config.dto';

export const configPath = join(process.cwd(), 'config.json');

export function getConfig() {
  let port = 7900;
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(
        readFileSync(configPath, 'utf-8'),
      ) as ConfigData;
      if (config.port) {
        port = config.port;
      }
    } catch {
      console.warn('Failed to read config.json, using default port 7900');
    }
  }
  return { port };
}
