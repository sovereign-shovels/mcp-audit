import { promises as fs, mkdirSync, existsSync } from 'fs';
import { join, resolve, basename } from 'path';
import { spawn } from 'child_process';

export interface SourceFile {
  path: string;
  content: string;
}

export interface ScannedPackage {
  name: string;
  source: string;
  files: SourceFile[];
}

function isGitHubUrl(input: string): boolean {
  return /^https?:\/\/github\.com\/.+?\/.+/.test(input);
}

function isNpmPackage(input: string): boolean {
  return !input.startsWith('/') && !input.startsWith('.') && !isGitHubUrl(input) && /^[a-zA-Z0-9@\-\._\/+]+$/.test(input);
}

function run(cmd: string, args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

async function downloadNpmTarball(pkgName: string, tmpDir: string): Promise<string> {
  const { stdout, stderr, code } = await run('npm', ['pack', pkgName, '--pack-destination', tmpDir]);
  if (code !== 0) throw new Error(`npm pack failed: ${stderr || stdout}`);
  const lines = stdout.split('\n').filter(Boolean);
  const tarball = lines[lines.length - 1].trim();
  if (!tarball) throw new Error('npm pack did not produce a tarball');
  return join(tmpDir, basename(tarball));
}

async function downloadGitHubTarball(url: string, tmpDir: string): Promise<string> {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  const [, owner, repoRaw] = match;
  const repo = repoRaw.replace(/\.git$/, '');
  const tarballUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.tar.gz`;
  const dest = join(tmpDir, `${repo}.tar.gz`);

  const res = await fetch(tarballUrl);
  if (!res.ok) {
    const fallbackUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/master.tar.gz`;
    const fallbackRes = await fetch(fallbackUrl);
    if (!fallbackRes.ok) throw new Error(`Failed to download GitHub tarball: ${res.status} / ${fallbackRes.status}`);
    const arrayBuffer = await fallbackRes.arrayBuffer();
    await fs.writeFile(dest, Buffer.from(arrayBuffer));
    return dest;
  }
  const arrayBuffer = await res.arrayBuffer();
  await fs.writeFile(dest, Buffer.from(arrayBuffer));
  return dest;
}

async function extractTarball(tarballPath: string, extractDir: string): Promise<void> {
  mkdirSync(extractDir, { recursive: true });
  const { code, stderr } = await run('tar', ['-xzf', tarballPath, '-C', extractDir, '--strip-components=1']);
  if (code !== 0) throw new Error(`tar extraction failed: ${stderr}`);
}

async function collectSourceFiles(dir: string): Promise<SourceFile[]> {
  const results: SourceFile[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      results.push(...await collectSourceFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = entry.name.split('.').pop()?.toLowerCase();
      if (['ts', 'js', 'mjs', 'cjs', 'py'].includes(ext || '')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          results.push({ path: fullPath, content });
        } catch { /* skip unreadable */ }
      }
    }
  }
  return results;
}

export async function scanTarget(input: string): Promise<ScannedPackage> {
  const tmpBase = join(process.env.TMPDIR || '/tmp', `mcp-audit-${Date.now()}`);
  mkdirSync(tmpBase, { recursive: true });

  try {
    if (existsSync(resolve(input))) {
      const files = await collectSourceFiles(resolve(input));
      return { name: basename(resolve(input)), source: resolve(input), files };
    }

    if (isNpmPackage(input)) {
      const tarball = await downloadNpmTarball(input, tmpBase);
      const extractDir = join(tmpBase, 'pkg');
      await extractTarball(tarball, extractDir);
      const files = await collectSourceFiles(extractDir);
      return { name: input, source: `npm:${input}`, files };
    }

    if (isGitHubUrl(input)) {
      const tarball = await downloadGitHubTarball(input, tmpBase);
      const extractDir = join(tmpBase, 'repo');
      await extractTarball(tarball, extractDir);
      const files = await collectSourceFiles(extractDir);
      return { name: basename(input), source: `github:${input}`, files };
    }

    throw new Error(`Unrecognized target: ${input}`);
  } catch (err) {
    try { await fs.rm(tmpBase, { recursive: true, force: true }); } catch { /* ignore */ }
    throw err;
  }
}
