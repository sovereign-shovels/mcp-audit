import * as path from 'path';
import { extractTools } from '../src/parse';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('extractTools', () => {
  test('extracts tools from safe server', () => {
    const safePath = path.join(fixturesDir, 'safe-server');
    const tools = extractTools(safePath);

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some(t => t.name === 'read_file')).toBe(true);
  });

  test('extracts tools from dangerous server', () => {
    const dangerousPath = path.join(fixturesDir, 'dangerous-server');
    const tools = extractTools(dangerousPath);

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some(t => t.name === 'write_any_file')).toBe(true);
    expect(tools.some(t => t.name === 'run_command')).toBe(true);
  });

  test('tools have names', () => {
    const safePath = path.join(fixturesDir, 'safe-server');
    const tools = extractTools(safePath);

    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe('string');
    }
  });
});
