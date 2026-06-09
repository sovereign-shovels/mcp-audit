import { SourceFile } from './scanner';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Category = 'filesystem' | 'shell' | 'network' | 'secrets' | 'code-exec' | 'general';

export interface Finding {
  file: string;
  line: number;
  category: Category;
  severity: Severity;
  message: string;
  snippet: string;
}

interface Pattern {
  category: Category;
  severity: Severity;
  regex: RegExp;
  message: string;
  languages: string[];
}

const patterns: Pattern[] = [
  // Filesystem
  {
    category: 'filesystem',
    severity: 'critical',
    regex: /fs\.writeFile\s*\(\s*(?!.*['"]\/(tmp|tmp\/|var\/tmp|dev\/null)['"]).*[^'"]\w+[^'"]/,
    message: 'fs.writeFile with potentially user-controlled path',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'filesystem',
    severity: 'high',
    regex: /fs\.writeFileSync\s*\(/,
    message: 'fs.writeFileSync detected — verify path is allowlisted',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'filesystem',
    severity: 'critical',
    regex: /fs\.rm\s*\(\s*(?!.*['"]\/(tmp|tmp\/|var\/tmp|dev\/null)['"]).*[^'"]\w+[^'"]/,
    message: 'fs.rm without apparent allowlist',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'filesystem',
    severity: 'high',
    regex: /fs\.readFile\s*\(\s*(?!.*['"]\/(tmp|tmp\/|var\/tmp|dev\/null)['"]).*[^'"]\w+[^'"]/,
    message: 'fs.readFile outside scoped directory',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'filesystem',
    severity: 'high',
    regex: /fs\.readdir\s*\(\s*(?!.*['"]\/(tmp|tmp\/|var\/tmp|dev\/null)['"]).*[^'"]\w+[^'"]/,
    message: 'fs.readdir with potentially user-controlled path',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  // Shell
  {
    category: 'shell',
    severity: 'critical',
    regex: /(?:child_process\.)?exec\s*\(/,
    message: 'exec with potential user input',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'shell',
    severity: 'critical',
    regex: /(?:child_process\.)?execSync\s*\(/,
    message: 'execSync with potential user input',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'shell',
    severity: 'high',
    regex: /(?:child_process\.)?spawn\s*\(/,
    message: 'spawn without argument validation',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'shell',
    severity: 'high',
    regex: /(?:child_process\.)?spawnSync\s*\(/,
    message: 'spawnSync without argument validation',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  // Network
  {
    category: 'network',
    severity: 'medium',
    regex: /fetch\s*\(\s*(?!.*['"]https?:\/\/[^'"]+['"]).*[^'"]\w+[^'"]/,
    message: 'fetch to user-controlled URL without allowlist',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'network',
    severity: 'medium',
    regex: /axios\.(get|post|put|delete|patch)\s*\(/,
    message: 'axios request without allowlist',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'network',
    severity: 'medium',
    regex: /https?\.request\s*\(/,
    message: 'raw HTTP request without allowlist',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  // Secrets
  {
    category: 'secrets',
    severity: 'low',
    regex: /process\.env\.[A-Z_]*(?:KEY|SECRET|TOKEN|PWD|PASSWORD)[A-Z_]*/,
    message: 'process.env reads sensitive-looking variable',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'secrets',
    severity: 'medium',
    regex: /readFileSync\s*\(\s*['"]\.env/,
    message: 'Reading .env file directly',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  // Code execution
  {
    category: 'code-exec',
    severity: 'critical',
    regex: /\beval\s*\(/,
    message: 'eval() detected',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'code-exec',
    severity: 'critical',
    regex: /new\s+Function\s*\(/,
    message: 'new Function() detected',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'code-exec',
    severity: 'critical',
    regex: /vm\.runInContext\s*\(/,
    message: 'vm.runInContext detected',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  {
    category: 'code-exec',
    severity: 'critical',
    regex: /vm\.runInNewContext\s*\(/,
    message: 'vm.runInNewContext detected',
    languages: ['ts', 'js', 'mjs', 'cjs'],
  },
  // Python patterns
  {
    category: 'shell',
    severity: 'critical',
    regex: /os\.system\s*\(/,
    message: 'os.system detected',
    languages: ['py'],
  },
  {
    category: 'shell',
    severity: 'critical',
    regex: /subprocess\.call\s*\(\s*shell\s*=\s*True/,
    message: 'subprocess.call with shell=True',
    languages: ['py'],
  },
  {
    category: 'shell',
    severity: 'high',
    regex: /subprocess\.Popen\s*\(/,
    message: 'subprocess.Popen detected',
    languages: ['py'],
  },
  {
    category: 'filesystem',
    severity: 'high',
    regex: /open\s*\(\s*(?!.*['"](?:\/tmp\/|r['"]|['"]r['"]|"))[^'"]*\w+[^'"]*/,
    message: 'open() with potentially user-controlled path',
    languages: ['py'],
  },
  {
    category: 'code-exec',
    severity: 'critical',
    regex: /\beval\s*\(/,
    message: 'eval() detected in Python',
    languages: ['py'],
  },
  {
    category: 'code-exec',
    severity: 'critical',
    regex: /\bexec\s*\(/,
    message: 'exec() detected in Python',
    languages: ['py'],
  },
];

export function analyze(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    const ext = file.path.split('.').pop()?.toLowerCase() || '';
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of patterns) {
        if (!pattern.languages.includes(ext)) continue;
        if (pattern.regex.test(line)) {
          findings.push({
            file: file.path,
            line: i + 1,
            category: pattern.category,
            severity: pattern.severity,
            message: pattern.message,
            snippet: line.trim(),
          });
        }
      }
    }
  }

  return findings;
}
