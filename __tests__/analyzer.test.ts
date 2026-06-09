import { analyze, Finding } from '../src/analyzer';
import { SourceFile } from '../src/scanner';

function file(name: string, content: string): SourceFile {
  return { path: `/test/${name}`, content };
}

describe('analyzer', () => {
  it('returns empty for safe code', () => {
    const files = [file('safe.ts', 'console.log("hello");')];
    expect(analyze(files)).toEqual([]);
  });

  it('flags eval in JS', () => {
    const files = [file('bad.js', 'eval(userInput);')];
    const f = analyze(files);
    expect(f.length).toBe(1);
    expect(f[0].category).toBe('code-exec');
    expect(f[0].severity).toBe('critical');
  });

  it('flags new Function in TS', () => {
    const files = [file('bad.ts', 'const fn = new Function("return 1");')];
    const f = analyze(files);
    expect(f.length).toBe(1);
    expect(f[0].category).toBe('code-exec');
    expect(f[0].message).toContain('new Function');
  });

  it('flags vm.runInContext', () => {
    const files = [file('vm.ts', 'vm.runInContext(code, ctx);')];
    const f = analyze(files);
    expect(f.length).toBe(1);
    expect(f[0].category).toBe('code-exec');
  });

  it('flags child_process.exec', () => {
    const files = [file('shell.ts', 'import { exec } from "child_process"; exec(cmd);')];
    const f = analyze(files);
    expect(f.length).toBeGreaterThanOrEqual(1);
    expect(f.some(x => x.message.includes('exec'))).toBe(true);
  });

  it('flags child_process.spawn', () => {
    const files = [file('shell.ts', 'spawn("ls", ["-la"]);')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'shell' && x.message.includes('spawn'))).toBe(true);
  });

  it('flags fs.writeFile with user-controlled path', () => {
    const files = [file('fs.ts', 'fs.writeFile(req.body.path, data);')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'filesystem' && x.message.includes('writeFile'))).toBe(true);
  });

  it('flags fs.rm without allowlist', () => {
    const files = [file('fs.ts', 'fs.rm(targetPath);')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'filesystem' && x.message.includes('rm'))).toBe(true);
  });

  it('flags fs.readFile outside scoped dir', () => {
    const files = [file('fs.ts', 'fs.readFile(userPath);')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'filesystem' && x.message.includes('readFile'))).toBe(true);
  });

  it('flags fetch to user-controlled URL', () => {
    const files = [file('net.ts', 'fetch(url);')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'network' && x.message.includes('fetch'))).toBe(true);
  });

  it('does NOT flag fetch with hardcoded URL', () => {
    const files = [file('net.ts', 'fetch("https://example.com");')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'network')).toBe(false);
  });

  it('flags process.env reading secrets', () => {
    const files = [file('env.ts', 'const key = process.env.API_KEY;')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'secrets')).toBe(true);
  });

  it('flags reading .env file', () => {
    const files = [file('env.ts', 'readFileSync(".env")')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'secrets' && x.message.includes('.env'))).toBe(true);
  });

  it('flags Python os.system', () => {
    const files = [file('bad.py', 'import os; os.system(cmd)')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'shell' && x.message.includes('os.system'))).toBe(true);
  });

  it('flags Python eval', () => {
    const files = [file('bad.py', 'eval(user_input)')];
    const f = analyze(files);
    expect(f.some(x => x.category === 'code-exec')).toBe(true);
  });

  it('reports correct line numbers', () => {
    const files = [file('multi.ts', 'console.log("ok");\neval("bad");')];
    const f = analyze(files);
    expect(f[0].line).toBe(2);
  });

  it('handles multiple findings in one file', () => {
    const files = [file('multi.ts', 'eval(x);\nfetch(url);\nexec(cmd);')];
    const f = analyze(files);
    expect(f.length).toBeGreaterThanOrEqual(3);
  });

  it('ignores node_modules in path but still scans given files', () => {
    const files = [file('node_modules/pkg/bad.ts', 'eval(x);')];
    const f = analyze(files);
    expect(f.length).toBe(1);
  });
});
