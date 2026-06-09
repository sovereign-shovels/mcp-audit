import { scanTarget } from '../src/scanner';
import { analyze } from '../src/analyzer';
import { score } from '../src/scorer';

jest.setTimeout(120000);

describe('integration', () => {
  it('scans a real safe npm package', async () => {
    const pkg = await scanTarget('is-positive');
    expect(pkg.files.length).toBeGreaterThan(0);
    const findings = analyze(pkg.files);
    expect(findings.length).toBe(0);
    const s = score(findings);
    expect(s.grade).toBe('A');
  });

  it('scans another real safe npm package', async () => {
    const pkg = await scanTarget('is-odd');
    expect(pkg.files.length).toBeGreaterThan(0);
    const findings = analyze(pkg.files);
    expect(findings.filter(f => f.severity === 'critical' || f.severity === 'high').length).toBe(0);
    const s = score(findings);
    expect(s.grade).toBe('A');
  });
});
