import { loadConfig, configPath } from '../src/config';

describe('config', () => {
  it('returns defaults when no config exists', () => {
    const cfg = loadConfig('mcp-audit-test-not-exist', { endpoint: 'http://localhost:11434', model: 'llama3.2' });
    expect(cfg.endpoint).toBe('http://localhost:11434');
    expect(cfg.model).toBe('llama3.2');
  });

  it('overrides defaults with cliFlags', () => {
    const cfg = loadConfig('mcp-audit-test', { endpoint: 'a', model: 'b' }, { endpoint: 'c' });
    expect(cfg.endpoint).toBe('c');
    expect(cfg.model).toBe('b');
  });

  it('computes configPath', () => {
    const p = configPath('mcp-audit');
    expect(p).toContain('config.toml');
  });
});
