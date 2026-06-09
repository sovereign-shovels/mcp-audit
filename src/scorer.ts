import { Finding, Severity } from './analyzer';

export type Grade = 'A' | 'B' | 'C' | 'F';

export interface ScoreResult {
  grade: Grade;
  score: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

const severityWeights: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 0.5,
};

export function score(findings: Finding[]): ScoreResult {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: findings.length,
  };

  let rawScore = 100;

  for (const f of findings) {
    summary[f.severity]++;
    rawScore -= severityWeights[f.severity];
  }

  rawScore = Math.max(0, rawScore);

  let grade: Grade;
  if (summary.critical > 0 || summary.high >= 3) {
    grade = 'F';
  } else if (summary.high > 0 || summary.medium >= 4) {
    grade = 'C';
  } else if (summary.medium > 0 || summary.low >= 5) {
    grade = 'B';
  } else {
    grade = 'A';
  }

  return { grade, score: Math.round(rawScore), summary };
}
