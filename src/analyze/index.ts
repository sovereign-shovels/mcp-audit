import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { SecurityFinding, Severity, Grade } from '../types';

export interface AnalysisResult {
  findings: SecurityFinding[];
  filesAnalyzed: number;
}

export function analyzePackage(packagePath: string): AnalysisResult {
  const findings: SecurityFinding[] = [];
  let filesAnalyzed = 0;

  const files = findSourceFiles(packagePath);

  for (const file of files) {
    filesAnalyzed++;
    const fileFindings = analyzeFile(file);
    findings.push(...fileFindings);
  }

  return { findings, filesAnalyzed };
}

function findSourceFiles(packagePath: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
        files.push(fullPath);
      }
    }
  }

  walk(packagePath);
  return files;
}

function analyzeFile(filePath: string): SecurityFinding[] {
  const sourceText = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ES2020,
    true
  );

  const findings: SecurityFinding[] = [];

  function visit(node: ts.Node) {
    // Check for fs operations with dangerous patterns
    checkFileSystemOperations(node, sourceFile, findings);
    // Check for shell execution
    checkShellExecution(node, sourceFile, findings);
    // Check for network requests
    checkNetworkRequests(node, sourceFile, findings);
    // Check for secret access
    checkSecretAccess(node, sourceFile, findings);
    // Check for eval/code execution
    checkCodeExecution(node, sourceFile, findings);

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function getLine(node: ts.Node, sourceFile: ts.SourceFile): number {
  return ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line + 1;
}

function checkFileSystemOperations(node: ts.Node, sourceFile: ts.SourceFile, findings: SecurityFinding[]) {
  if (!ts.isCallExpression(node)) return;

  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return;

  const objName = getObjectName(expr.expression);
  const methodName = expr.name.text;

  if (objName === 'fs' || objName === 'fs/promises' || objName === 'node:fs') {
    const dangerousMethods: Record<string, { severity: Severity; message: string }> = {
      'writeFile': { severity: 'critical', message: 'Unrestricted file write detected' },
      'writeFileSync': { severity: 'critical', message: 'Unrestricted file write detected' },
      'appendFile': { severity: 'high', message: 'Unrestricted file append detected' },
      'appendFileSync': { severity: 'high', message: 'Unrestricted file append detected' },
      'unlink': { severity: 'critical', message: 'File deletion detected' },
      'unlinkSync': { severity: 'critical', message: 'File deletion detected' },
      'rm': { severity: 'critical', message: 'File/directory deletion detected' },
      'rmSync': { severity: 'critical', message: 'File/directory deletion detected' },
      'rmdir': { severity: 'critical', message: 'Directory deletion detected' },
      'rmdirSync': { severity: 'critical', message: 'Directory deletion detected' },
      'readFile': { severity: 'medium', message: 'File read without path validation' },
      'readFileSync': { severity: 'medium', message: 'File read without path validation' },
      'readdir': { severity: 'low', message: 'Directory listing without path validation' },
    };

    if (dangerousMethods[methodName]) {
      // Check if path argument looks user-controlled
      const firstArg = node.arguments[0];
      const isUserControlled = firstArg && !isSafePath(firstArg);

      if (isUserControlled || ['writeFile', 'writeFileSync', 'unlink', 'unlinkSync', 'rm', 'rmSync'].includes(methodName)) {
        const rule = dangerousMethods[methodName];
        findings.push({
          rule: `fs.${methodName}`,
          category: 'filesystem',
          severity: rule.severity,
          message: rule.message,
          sourceFile: sourceFile.fileName,
          line: getLine(node, sourceFile)
        });
      }
    }
  }
}

function checkShellExecution(node: ts.Node, sourceFile: ts.SourceFile, findings: SecurityFinding[]) {
  if (!ts.isCallExpression(node)) return;

  const expr = node.expression;
  let isDangerous = false;
  let methodName = '';

  if (ts.isIdentifier(expr)) {
    methodName = expr.text;
    if (['exec', 'execSync'].includes(methodName)) {
      isDangerous = true;
    }
  } else if (ts.isPropertyAccessExpression(expr)) {
    methodName = expr.name.text;
    const objName = getObjectName(expr.expression);
    if ((objName === 'child_process' || objName === 'node:child_process') &&
        ['exec', 'execSync', 'spawn', 'spawnSync'].includes(methodName)) {
      isDangerous = true;
    }
  }

  if (isDangerous) {
    findings.push({
      rule: methodName,
      category: 'shell',
      severity: 'critical',
      message: `Shell/command execution via ${methodName} detected`,
      sourceFile: sourceFile.fileName,
      line: getLine(node, sourceFile)
    });
  }
}

function checkNetworkRequests(node: ts.Node, sourceFile: ts.SourceFile, findings: SecurityFinding[]) {
  if (!ts.isCallExpression(node)) return;

  const expr = node.expression;
  let isNetworkCall = false;
  let methodName = '';

  if (ts.isIdentifier(expr)) {
    methodName = expr.text;
    if (methodName === 'fetch') isNetworkCall = true;
  } else if (ts.isPropertyAccessExpression(expr)) {
    methodName = expr.name.text;
    const objName = getObjectName(expr.expression);
    if (objName === 'axios' && ['get', 'post', 'put', 'delete', 'request'].includes(methodName)) {
      isNetworkCall = true;
    }
  }

  if (isNetworkCall) {
    // Check if URL is user-controlled
    const firstArg = node.arguments[0];
    const isUserControlled = firstArg && !isSafeUrl(firstArg);

    findings.push({
      rule: methodName,
      category: 'network',
      severity: isUserControlled ? 'high' : 'medium',
      message: isUserControlled
        ? 'Network request with user-controlled URL detected'
        : 'Network request without allowlist validation detected',
      sourceFile: sourceFile.fileName,
      line: getLine(node, sourceFile)
    });
  }
}

function checkSecretAccess(node: ts.Node, sourceFile: ts.SourceFile, findings: SecurityFinding[]) {
  if (!ts.isPropertyAccessExpression(node)) return;

  const objName = getObjectName(node.expression);
  const propName = node.name.text;

  if (objName === 'process' && propName === 'env') {
    const parent = node.parent;
    if (ts.isElementAccessExpression(parent) && ts.isStringLiteral(parent.argumentExpression)) {
      const envVar = parent.argumentExpression.text;
      if (/key|secret|token|password|credential|auth/i.test(envVar)) {
        findings.push({
          rule: 'process.env[secret]',
          category: 'secrets',
          severity: 'medium',
          message: `Access to sensitive environment variable: ${envVar}`,
          sourceFile: sourceFile.fileName,
          line: getLine(node, sourceFile)
        });
      }
    }
  }

  // Check for .env file reads
  if (ts.isCallExpression(node.parent)) {
    const call = node.parent;
    if (ts.isPropertyAccessExpression(call.expression)) {
      const methodName = call.expression.name.text;
      if (methodName === 'readFile' || methodName === 'readFileSync') {
        const firstArg = call.arguments[0];
        if (ts.isStringLiteral(firstArg) && firstArg.text.includes('.env')) {
          findings.push({
            rule: 'fs.readFile(.env)',
            category: 'secrets',
            severity: 'medium',
            message: 'Reading .env file detected',
            sourceFile: sourceFile.fileName,
            line: getLine(node, sourceFile)
          });
        }
      }
    }
  }
}

function checkCodeExecution(node: ts.Node, sourceFile: ts.SourceFile, findings: SecurityFinding[]) {
  if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;

  const expr = ts.isCallExpression(node) ? node.expression :
               ts.isNewExpression(node) ? node.expression : null;
  if (!expr) return;

  let isDangerous = false;
  let methodName = '';

  if (ts.isIdentifier(expr)) {
    methodName = expr.text;
    if (methodName === 'eval') isDangerous = true;
  } else if (ts.isPropertyAccessExpression(expr)) {
    methodName = expr.name.text;
    const objName = getObjectName(expr.expression);
    if (objName === 'vm' && ['runInContext', 'runInNewContext', 'Script'].includes(methodName)) {
      isDangerous = true;
    }
  } else if (ts.isIdentifier(expr) && expr.text === 'Function') {
    isDangerous = true;
    methodName = 'new Function()';
  }

  if (isDangerous) {
    findings.push({
      rule: methodName,
      category: 'code-execution',
      severity: 'critical',
      message: `Dynamic code execution via ${methodName} detected`,
      sourceFile: sourceFile.fileName,
      line: getLine(node, sourceFile)
    });
  }
}

function getObjectName(node: ts.Node): string {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return getObjectName(node.expression);
  return '';
}

function isSafePath(node: ts.Node): boolean {
  // Consider string literals with hardcoded paths as safe
  if (ts.isStringLiteral(node)) {
    return !node.text.includes('${') && !node.text.startsWith('/tmp');
  }
  return false;
}

function isSafeUrl(node: ts.Node): boolean {
  if (ts.isStringLiteral(node)) {
    return node.text.startsWith('http') && !node.text.includes('${');
  }
  return false;
}

export function calculateGrade(findings: SecurityFinding[]): Grade {
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;

  if (critical > 0) return 'F';
  if (high >= 2) return 'C';
  if (high === 1) return 'B';
  if (findings.length > 0) return 'B';
  return 'A';
}
