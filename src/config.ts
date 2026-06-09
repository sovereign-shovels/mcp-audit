import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ConfigShape {
  endpoint?: string;
  model?: string;
  apiKeyEnvVar?: string;
  provider?: string;
  [key: string]: unknown;
}

function parseToml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let section: Record<string, unknown> = result;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const key = trimmed.slice(1, -1);
      section = {};
      result[key] = section;
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    } else if (v === 'true') { (section as Record<string, unknown>)[k] = true; continue; }
    else if (v === 'false') { (section as Record<string, unknown>)[k] = false; continue; }
    else if (!isNaN(Number(v))) { (section as Record<string, unknown>)[k] = Number(v); continue; }
    (section as Record<string, unknown>)[k] = v;
  }
  return result;
}

export function loadConfig(appName: string, defaults: ConfigShape, cliFlags: Partial<ConfigShape> = {}, envPrefix?: string): ConfigShape {
  const prefix = envPrefix || appName.toUpperCase().replace(/-/g, '_');
  let merged: ConfigShape = { ...defaults };
  const configDir = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  const configPath = join(configDir, appName, 'config.toml');
  try {
    const toml = readFileSync(configPath, 'utf-8');
    const parsed = parseToml(toml);
    const provider = parsed.provider as Record<string, unknown> | undefined;
    if (provider) {
      merged = { ...merged, endpoint: provider.endpoint ? String(provider.endpoint) : merged.endpoint, model: provider.model ? String(provider.model) : merged.model, apiKeyEnvVar: provider.apiKeyEnvVar ? String(provider.apiKeyEnvVar) : merged.apiKeyEnvVar };
    }
  } catch { /* optional */ }
  const env = (k: string) => process.env[`${prefix}_${k}`];
  merged = { ...merged, ...(env('ENDPOINT') ? { endpoint: env('ENDPOINT') } : {}), ...(env('MODEL') ? { model: env('MODEL') } : {}), ...(env('API_KEY_ENV') ? { apiKeyEnvVar: env('API_KEY_ENV') } : {}) };
  merged = { ...merged, ...cliFlags };
  return merged;
}

export function configPath(appName: string): string {
  const configDir = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(configDir, appName, 'config.toml');
}
