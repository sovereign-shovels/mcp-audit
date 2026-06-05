import * as fs from 'fs';
import { AuditResult, SecurityFinding, ReporterOptions, Grade } from '../types';

export function report(result: AuditResult, options: ReporterOptions): string {
  switch (options.format) {
    case 'json':
      return reportJson(result);
    case 'sarif':
      return reportSarif(result);
    case 'terminal':
    default:
      return reportTerminal(result);
  }
}

function gradeColor(grade: Grade): string {
  switch (grade) {
    case 'A': return '\x1b[32m'; // green
    case 'B': return '\x1b[33m'; // yellow
    case 'C': return '\x1b[38;5;208m'; // orange
    case 'F': return '\x1b[31m'; // red
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '\x1b[31m';
    case 'high': return '\x1b[38;5;208m';
    case 'medium': return '\x1b[33m';
    case 'low': return '\x1b[36m';
    default: return '\x1b[0m';
  }
}

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function reportTerminal(result: AuditResult): string {
  const lines: string[] = [];
  const g = gradeColor(result.grade);

  lines.push('');
  lines.push(`${BOLD}┌─────────────────────────────────────────────┐${RESET}`);
  lines.push(`${BOLD}│  MCP Audit Report                           │${RESET}`);
  lines.push(`${BOLD}└─────────────────────────────────────────────┘${RESET}`);
  lines.push('');
  lines.push(`  Package:    ${BOLD}${result.packageName}${RESET}`);
  lines.push(`  Version:    ${result.packageVersion || 'unknown'}${RESET}`);
  lines.push(`  Grade:      ${g}${BOLD}${result.grade}${RESET}`);
  lines.push(`  Tools:      ${result.toolsAnalyzed}`);
  lines.push(`  Files:      ${result.filesAnalyzed}`);
  lines.push(`  Findings:   ${result.findings.length}`);
  lines.push(`  Scanned:    ${result.scannedAt}`);
  lines.push('');

  if (result.findings.length === 0) {
    lines.push(`  ${g}✓ No security issues detected${RESET}`);
  } else {
    // Group by severity
    const bySeverity: Record<string, SecurityFinding[]> = {};
    for (const f of result.findings) {
      bySeverity[f.severity] = bySeverity[f.severity] || [];
      bySeverity[f.severity].push(f);
    }

    const order = ['critical', 'high', 'medium', 'low'];
    for (const sev of order) {
      const items = bySeverity[sev];
      if (!items || items.length === 0) continue;

      const c = severityColor(sev);
      lines.push(`  ${c}${BOLD}${sev.toUpperCase()} (${items.length})${RESET}`);
      lines.push(`  ${'─'.repeat(45)}`);

      for (const f of items) {
        const file = f.sourceFile ? f.sourceFile.split('/').pop() : 'unknown';
        const line = f.line ? `:${f.line}` : '';
        lines.push(`    ${c}•${RESET} ${f.message}`);
        lines.push(`      ${BOLD}${file}${line}${RESET} | ${f.rule}`);
      }
      lines.push('');
    }
  }

  lines.push(`${BOLD}───────────────────────────────────────────────${RESET}`);
  lines.push('');

  if (result.grade === 'F' || result.grade === 'C') {
    lines.push(`  ${g}⚠ This MCP server has dangerous patterns.${RESET}`);
    lines.push(`    Review findings before installing.`);
  } else if (result.grade === 'B') {
    lines.push(`  ${g}⚡ Some caution warranted.${RESET}`);
    lines.push(`    Review medium-severity findings.`);
  } else {
    lines.push(`  ${g}✓ Looks safe for most use cases.${RESET}`);
  }
  lines.push('');

  return lines.join('\n');
}

function reportJson(result: AuditResult): string {
  return JSON.stringify(result, null, 2);
}

function reportSarif(result: AuditResult): string {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'mcp-audit',
          version: '0.1.0',
          informationUri: 'https://github.com/sovereign-shovels/mcp-audit'
        }
      },
      results: result.findings.map((f, i) => ({
        ruleId: f.rule,
        level: severityToSarif(f.severity),
        message: { text: f.message },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: f.sourceFile || 'unknown' },
            region: f.line ? { startLine: f.line } : undefined
          }
        }]
      }))
    }]
  };

  return JSON.stringify(sarif, null, 2);
}

function severityToSarif(severity: string): string {
  switch (severity) {
    case 'critical': return 'error';
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'note';
    default: return 'warning';
  }
}
