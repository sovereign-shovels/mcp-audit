import { report } from '../src/reporter';
import { Finding } from '../src/analyzer';
import { ScoreResult } from '../src/scorer';

const mockScore: ScoreResult = {
  grade: 'C',
  score: 75,
  summary: { critical: 0, high: 1, medium: 2, low: 0, total: 3 },
};

const mockFindings: Finding[] = [
  { file: '/a.ts', line: 5, category: 'shell', severity: 'high', message: 'exec', snippet: 'exec(cmd)' },
  { file: '/b.ts', line: 2, category: 'network', severity: 'medium', message: 'fetch', snippet: 'fetch(url)' },
];

describe('reporter', () => {
  it('produces terminal output', () => {
    const out = report(mockFindings, mockScore, 'terminal', 'test-pkg');
    expect(out).toContain('test-pkg');
    expect(out).toContain('C');
    expect(out).toContain('exec');
  });

  it('produces valid JSON', () => {
    const out = report(mockFindings, mockScore, 'json', 'test-pkg');
    const parsed = JSON.parse(out);
    expect(parsed.package).toBe('test-pkg');
    expect(parsed.findings.length).toBe(2);
  });

  it('produces valid SARIF', () => {
    const out = report(mockFindings, mockScore, 'sarif', 'test-pkg');
    const parsed = JSON.parse(out);
    expect(parsed['$schema']).toContain('sarif');
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].results.length).toBe(2);
  });

  it('shows safe message when no findings in terminal', () => {
    const safeScore: ScoreResult = { grade: 'A', score: 100, summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 } };
    const out = report([], safeScore, 'terminal', 'safe-pkg');
    expect(out).toContain('No dangerous patterns');
  });
});
