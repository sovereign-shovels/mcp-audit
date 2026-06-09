import { scanTarget } from '../src/scanner';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('scanner', () => {
  const testDir = join(tmpdir(), `mcp-audit-scanner-test-${Date.now()}`);

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src', 'index.ts'), 'console.log("hello");');
    writeFileSync(join(testDir, 'package.json'), '{"name":"test"}');
  });

  afterAll(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('scans a local path', async () => {
    const pkg = await scanTarget(testDir);
    expect(pkg.files.length).toBeGreaterThan(0);
    expect(pkg.files[0].content).toContain('hello');
  });
});
