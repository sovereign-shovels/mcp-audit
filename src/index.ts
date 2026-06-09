#!/usr/bin/env node

import { scanTarget } from './scanner';
import { analyze } from './analyzer';
import { score } from './scorer';
import { report, OutputFormat } from './reporter';

function showHelp(): void {
  console.log(`
mcp-audit — security scanner for MCP servers

Usage:
  mcp-audit scan <target> [options]

Targets:
  npm-package     e.g. @modelcontextprotocol/server-filesystem
  github-url      e.g. https://github.com/user/repo
  local-path      e.g. ./my-mcp-server

Options:
  --json          Output JSON report
  --sarif         Output SARIF v2.1 report
  --help          Show this help

Examples:
  mcp-audit scan @modelcontextprotocol/server-filesystem
  mcp-audit scan https://github.com/modelcontextprotocol/servers --json
  mcp-audit scan ./my-server --sarif
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];
  if (command !== 'scan') {
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }

  const target = args[1];
  if (!target) {
    console.error('Missing target. Run mcp-audit --help for usage.');
    process.exit(1);
  }

  let format: OutputFormat = 'terminal';
  if (args.includes('--json')) format = 'json';
  if (args.includes('--sarif')) format = 'sarif';

  try {
    const pkg = await scanTarget(target);
    const findings = analyze(pkg.files);
    const result = score(findings);
    const output = report(findings, result, format, pkg.name);
    console.log(output);
    process.exit(result.grade === 'F' ? 2 : result.grade === 'C' ? 1 : 0);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
