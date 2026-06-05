import * as path from 'path';
import { analyzePackage, calculateGrade } from '../src/analyze';
import { SecurityFinding } from '../src/types';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('analyzePackage', () => {
  test('safe server has no critical or high findings', () => {
    const safePath = path.join(fixturesDir, 'safe-server');
    const result = analyzePackage(safePath);

    const criticalOrHigh = result.findings.filter(
      f => f.severity === 'critical' || f.severity === 'high'
    );

    expect(criticalOrHigh).toHaveLength(0);
    expect(result.filesAnalyzed).toBeGreaterThan(0);
  });

  test('dangerous server detects file write', () => {
    const dangerousPath = path.join(fixturesDir, 'dangerous-server');
    const result = analyzePackage(dangerousPath);

    const fileWrites = result.findings.filter(
      f => f.rule === 'fs.writeFileSync' && f.category === 'filesystem'
    );

    expect(fileWrites.length).toBeGreaterThan(0);
    expect(fileWrites[0].severity).toBe('critical');
  });

  test('dangerous server detects shell execution', () => {
    const dangerousPath = path.join(fixturesDir, 'dangerous-server');
    const result = analyzePackage(dangerousPath);

    const shellExecs = result.findings.filter(
      f => f.category === 'shell'
    );

    expect(shellExecs.length).toBeGreaterThan(0);
    expect(shellExecs[0].severity).toBe('critical');
  });

  test('dangerous server detects eval', () => {
    const dangerousPath = path.join(fixturesDir, 'dangerous-server');
    const result = analyzePackage(dangerousPath);

    const evals = result.findings.filter(
      f => f.rule === 'eval'
    );

    expect(evals.length).toBeGreaterThan(0);
    expect(evals[0].severity).toBe('critical');
  });

  test('dangerous server detects network with user-controlled URL', () => {
    const dangerousPath = path.join(fixturesDir, 'dangerous-server');
    const result = analyzePackage(dangerousPath);

    const network = result.findings.filter(
      f => f.category === 'network' && f.severity === 'high'
    );

    expect(network.length).toBeGreaterThan(0);
  });

  test('dangerous server detects secret access', () => {
    const dangerousPath = path.join(fixturesDir, 'dangerous-server');
    const result = analyzePackage(dangerousPath);

    const secrets = result.findings.filter(
      f => f.category === 'secrets'
    );

    expect(secrets.length).toBeGreaterThan(0);
  });

  test('dangerous server detects file deletion', () => {
    const dangerousPath = path.join(fixturesDir, 'dangerous-server');
    const result = analyzePackage(dangerousPath);

    const deletions = result.findings.filter(
      f => f.rule === 'fs.unlinkSync'
    );

    expect(deletions.length).toBeGreaterThan(0);
    expect(deletions[0].severity).toBe('critical');
  });
});

describe('calculateGrade', () => {
  test('A for no findings', () => {
    expect(calculateGrade([])).toBe('A');
  });

  test('B for medium findings', () => {
    const findings: SecurityFinding[] = [
      { rule: 'test', category: 'network', severity: 'medium', message: 'test' }
    ];
    expect(calculateGrade(findings)).toBe('B');
  });

  test('C for multiple high findings', () => {
    const findings: SecurityFinding[] = [
      { rule: 'test1', category: 'network', severity: 'high', message: 'test1' },
      { rule: 'test2', category: 'network', severity: 'high', message: 'test2' }
    ];
    expect(calculateGrade(findings)).toBe('C');
  });

  test('F for any critical finding', () => {
    const findings: SecurityFinding[] = [
      { rule: 'test', category: 'shell', severity: 'critical', message: 'test' }
    ];
    expect(calculateGrade(findings)).toBe('F');
  });
});
