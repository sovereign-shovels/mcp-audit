export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  sourceFile?: string;
  line?: number;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Grade = 'A' | 'B' | 'C' | 'F';

export interface SecurityFinding {
  rule: string;
  category: string;
  severity: Severity;
  message: string;
  toolName?: string;
  sourceFile?: string;
  line?: number;
}

export interface AuditResult {
  packageName: string;
  packageVersion?: string;
  grade: Grade;
  findings: SecurityFinding[];
  toolsAnalyzed: number;
  filesAnalyzed: number;
  scannedAt: string;
}

export interface ReporterOptions {
  format: 'terminal' | 'json' | 'sarif';
  outputPath?: string;
}

export interface PolicyConfig {
  name: string;
  rules: Record<string, boolean>;
}
