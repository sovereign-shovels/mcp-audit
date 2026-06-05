#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fetchPackage } from './fetch';
import { extractTools } from './parse';
import { analyzePackage, calculateGrade } from './analyze';
import { report } from './report';
import { AuditResult, ReporterOptions } from './types';

const program = new Command();

program
  .name('mcp-audit')
  .description('Security scanner for MCP servers')
  .version('0.1.0');

program
  .command('scan <source>')
  .description('Scan an MCP server package (npm name, GitHub URL, or local path)')
  .option('-f, --format <format>', 'Output format: terminal, json, sarif', 'terminal')
  .option('-o, --output <file>', 'Write output to file instead of stdout')
  .option('--no-cleanup', 'Keep downloaded package in temp directory')
  .action(async (source: string, options: { format: string; output?: string; cleanup: boolean }) => {
    try {
      console.error(`🔍 Fetching ${source}...`);
      const pkg = await fetchPackage(source);

      console.error(`📦 Analyzing ${pkg.packageName}...`);
      const tools = extractTools(pkg.extractedPath);
      const analysis = analyzePackage(pkg.extractedPath);

      const result: AuditResult = {
        packageName: pkg.packageName,
        packageVersion: extractVersion(pkg.extractedPath),
        grade: calculateGrade(analysis.findings),
        findings: analysis.findings,
        toolsAnalyzed: tools.length,
        filesAnalyzed: analysis.filesAnalyzed,
        scannedAt: new Date().toISOString()
      };

      const reporterOptions: ReporterOptions = {
        format: options.format as 'terminal' | 'json' | 'sarif',
        outputPath: options.output
      };

      const output = report(result, reporterOptions);

      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.error(`✅ Report written to ${options.output}`);
      } else {
        console.log(output);
      }

      // Exit with non-zero if grade is F
      if (result.grade === 'F') {
        process.exitCode = 1;
      }

      if (options.cleanup !== false) {
        pkg.cleanup();
      } else {
        console.error(`📁 Package kept at: ${pkg.extractedPath}`);
      }
    } catch (err) {
      console.error(`❌ Error: ${err}`);
      process.exit(1);
    }
  });

program
  .command('version')
  .description('Show version')
  .action(() => {
    console.log('0.1.0');
  });

program.parse();

function extractVersion(packagePath: string): string | undefined {
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf-8'));
    return pkgJson.version;
  } catch {
    return undefined;
  }
}
