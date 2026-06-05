import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { ToolDefinition } from '../types';

export function extractTools(packagePath: string): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  const files = findSourceFiles(packagePath);

  for (const file of files) {
    const fileTools = parseFile(file);
    tools.push(...fileTools);
  }

  return tools;
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

function parseFile(filePath: string): ToolDefinition[] {
  const sourceText = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ES2020,
    true
  );

  const tools: ToolDefinition[] = [];

  function visit(node: ts.Node) {
    // Look for tools array patterns
    if (ts.isArrayLiteralExpression(node)) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)) {
        const name = ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)
          ? parent.name.text
          : ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)
            ? parent.name.text
            : '';

        if (name.toLowerCase().includes('tool')) {
          for (const element of node.elements) {
            const tool = extractToolFromObject(element, filePath);
            if (tool) tools.push(tool);
          }
        }
      }
    }

    // Look for server.tool() calls
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        const methodName = expr.name.text;
        if (methodName === 'tool' || methodName === 'setRequestHandler') {
          const tool = extractToolFromCall(node, filePath);
          if (tool) tools.push(tool);
        }
      }
    }

    // Look for tool definitions in object literals with 'name' and 'handler'
    if (ts.isObjectLiteralExpression(node)) {
      const hasName = node.properties.some(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'name');
      const hasHandler = node.properties.some(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'handler');
      if (hasName && hasHandler) {
        const tool = extractToolFromObject(node, filePath);
        if (tool) tools.push(tool);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return tools;
}

function extractToolFromObject(node: ts.Node, filePath: string): ToolDefinition | null {
  if (!ts.isObjectLiteralExpression(node)) return null;

  let name = '';
  let description = '';
  let inputSchema: Record<string, unknown> | undefined;

  const line = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart()).line + 1;

  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!ts.isIdentifier(prop.name)) continue;

    const propName = prop.name.text;
    const value = prop.initializer;

    if (propName === 'name' && ts.isStringLiteral(value)) {
      name = value.text;
    } else if (propName === 'description' && ts.isStringLiteral(value)) {
      description = value.text;
    } else if (propName === 'inputSchema' || propName === 'schema') {
      inputSchema = extractJsonSchema(value);
    }
  }

  if (!name) return null;

  return { name, description, inputSchema, sourceFile: filePath, line };
}

function extractToolFromCall(node: ts.CallExpression, filePath: string): ToolDefinition | null {
  // server.tool(name, description, schema, handler)
  const args = node.arguments;
  if (args.length < 2) return null;

  let name = '';
  let description = '';
  let inputSchema: Record<string, unknown> | undefined;

  const line = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart()).line + 1;

  if (ts.isStringLiteral(args[0])) name = args[0].text;
  if (args[1] && ts.isStringLiteral(args[1])) description = args[1].text;
  if (args[2]) inputSchema = extractJsonSchema(args[2]);

  if (!name) return null;

  return { name, description, inputSchema, sourceFile: filePath, line };
}

function extractJsonSchema(node: ts.Node): Record<string, unknown> | undefined {
  // Try to extract a JSON schema from a zod object or plain object
  // For v0.1, we do a best-effort extraction
  if (ts.isObjectLiteralExpression(node)) {
    try {
      return astToJson(node);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function astToJson(node: ts.Node): any {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return parseFloat(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(astToJson);
  }
  if (ts.isObjectLiteralExpression(node)) {
    const obj: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        obj[prop.name.text] = astToJson(prop.initializer);
      }
    }
    return obj;
  }
  return undefined;
}
