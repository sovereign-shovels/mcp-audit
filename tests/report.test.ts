import { report } from '../src/report';
import { AuditResult } from '../src/types';

describe('report', () => {
  const mockResult: AuditResult = {
    packageName: 'test-server',
    packageVersion: '1.0.0',
    grade: 'F',
    findings: [
      { rule: 'fs.writeFileSync', category: 'filesystem', severity: 'critical', message: 'Unrestricted file write', sourceFile: '/test/index.ts', line: 10 },
      { rule: 'eval', category: 'code-execution', severity: 'critical', message: 'Dynamic code execution', sourceFile: '/test/index.ts', line: 20 }
    ],
    toolsAnalyzed: 2,
    filesAnalyzed: 1,
    scannedAt: '2026-06-04T10:00:00Z'
  };

  test('terminal report includes grade and findings', () => {
    const output = report(mockResult, { format: 'terminal' });
    expect(output).toContain('F');
    expect(output).toContain('Unrestricted file write');
    expect(output).toContain('eval');
  });

  test('json report is valid JSON', () => {
    const output = report(mockResult, { format: 'json' });
    const parsed = JSON.parse(output);
    expect(parsed.packageName).toBe('test-server');
    expect(parsed.grade).toBe('F');
    expect(parsed.findings).toHaveLength(2);
  });

  test('sarif report has correct schema', () => {
    const output = report(mockResult, { format: 'sarif' });
    const parsed = JSON.parse(output);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].results).toHaveLength(2);
    expect(parsed.runs[0].results[0].level).toBe('error');
  });

  test('safe server gets A grade in terminal', () => {
    const safeResult: AuditResult = {
      packageName: 'safe-server',
      grade: 'A',
      findings: [],
      toolsAnalyzed: 1,
      filesAnalyzed: 1,
      scannedAt: '2026-06-04T10:00:00Z'
    };

    const output = report(safeResult, { format: 'terminal' });
    expect(output).toContain('A');
    expect(output).toContain('No security issues detected');
  });
});
