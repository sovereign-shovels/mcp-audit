import { Finding } from './analyzer';
import { ScoreResult } from './scorer';

export type OutputFormat = 'terminal' | 'json' | 'sarif';

function severityColor(sev: string): string {
  switch (sev) {
    case 'critical': return '\x1b[31m'; // red
    case 'high': return '\x1b[91m'; // bright red
    case 'medium': return '\x1b[33m'; // yellow
    case 'low': return '\x1b[36m'; // cyan
    default: return '';
  }
}
const RESET = '\x1b[0m';

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 3) + '...';
}

export function report(findings: Finding[], score: ScoreResult, format: OutputFormat, pkgName: string): string {
  if (format === 'json') {
    return JSON.stringify({ package: pkgName, score, findings }, null, 2);
  }

  if (format === 'sarif') {
    return generateSarif(findings, score, pkgName);
  }

  // Terminal
  const gradeColor = score.grade === 'A' ? '\x1b[32m' : score.grade === 'B' ? '\x1b[33m' : score.grade === 'C' ? '\x1b[38;5;208m' : '\x1b[31m';
  let out = '';
  out += `\n  mcp-audit report for ${pkgName}\n`;
  out += `  ──────────────────────────────────\n`;
  out += `  Grade: ${gradeColor}${score.grade}${RESET}   Score: ${score.score}/100\n`;
  out += `  Critical: ${score.summary.critical} | High: ${score.summary.high} | Medium: ${score.summary.medium} | Low: ${score.summary.low}\n`;
  out += `  ──────────────────────────────────\n`;

  if (findings.length === 0) {
    out += '  No dangerous patterns detected.\n';
  } else {
    for (const f of findings) {
      const color = severityColor(f.severity);
      const file = truncate(f.file.split('/').pop() || f.file, 20);
      out += `  ${color}[${f.severity.toUpperCase().padEnd(8)}]${RESET} ${file}:${f.line.toString().padStart(4)}  ${truncate(f.message, 45)}\n`;
      out += `          ${truncate(f.snippet, 70)}\n`;
    }
  }

  out += `  ──────────────────────────────────\n\n`;
  return out;
}

function generateSarif(findings: Finding[], score: ScoreResult, pkgName: string): string {
  const rules: Record<string, any> = {};
  const results: any[] = [];

  for (const f of findings) {
    const ruleId = `${f.category}-${f.message.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
    if (!rules[ruleId]) {
      rules[ruleId] = {
        id: ruleId,
        name: f.message,
        shortDescription: { text: f.message },
        defaultConfiguration: { level: f.severity === 'critical' || f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'note' },
      };
    }
    results.push({
      ruleId,
      message: { text: f.message },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: f.file },
          region: { startLine: f.line, snippet: { text: f.snippet } },
        },
      }],
    });
  }

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'mcp-audit',
          version: '0.1.0',
          informationUri: 'https://github.com/sovereign-shovels/mcp-audit',
          rules: Object.values(rules),
        },
      },
      results,
      properties: {
        package: pkgName,
        grade: score.grade,
        score: score.score,
      },
    }],
  };

  return JSON.stringify(sarif, null, 2);
}
