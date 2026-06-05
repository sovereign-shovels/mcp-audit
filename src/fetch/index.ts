import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import * as tar from 'tar';

export interface FetchedPackage {
  source: 'npm' | 'github' | 'local';
  packageName: string;
  version?: string;
  extractedPath: string;
  cleanup: () => void;
}

export async function fetchPackage(source: string): Promise<FetchedPackage> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-audit-'));

  if (source.startsWith('http://') || source.startsWith('https://')) {
    // GitHub URL
    return fetchFromGitHub(source, tempDir);
  }

  if (fs.existsSync(source)) {
    const stat = fs.statSync(source);
    if (stat.isDirectory() || stat.isFile()) {
      return fetchFromLocal(source, tempDir);
    }
  }

  // Assume npm package name
  return fetchFromNpm(source, tempDir);
}

async function fetchFromNpm(packageName: string, tempDir: string): Promise<FetchedPackage> {
  const extractDir = path.join(tempDir, 'package');
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    // Download tarball
    execSync(`npm pack ${packageName} --pack-destination ${tempDir}`, {
      cwd: tempDir,
      stdio: 'pipe',
      timeout: 60000
    });

    // Find the tarball
    const files = fs.readdirSync(tempDir);
    const tarball = files.find(f => f.endsWith('.tgz'));
    if (!tarball) {
      throw new Error(`No tarball found after npm pack for ${packageName}`);
    }

    // Extract
    await tar.x({
      file: path.join(tempDir, tarball),
      cwd: extractDir,
      strip: 1
    });

    return {
      source: 'npm',
      packageName,
      extractedPath: extractDir,
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
    };
  } catch (err) {
    cleanup(tempDir);
    throw new Error(`Failed to fetch npm package ${packageName}: ${err}`);
  }
}

async function fetchFromGitHub(url: string, tempDir: string): Promise<FetchedPackage> {
  const extractDir = path.join(tempDir, 'repo');
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    // Convert github.com URL to git clone URL if needed
    let cloneUrl = url;
    if (url.includes('github.com') && !url.endsWith('.git')) {
      cloneUrl = url + '.git';
    }

    execSync(`git clone --depth 1 ${cloneUrl} ${extractDir}`, {
      stdio: 'pipe',
      timeout: 120000
    });

    // Try to get package name from package.json
    let packageName = url.split('/').pop()?.replace('.git', '') || 'unknown';
    try {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(extractDir, 'package.json'), 'utf-8'));
      packageName = pkgJson.name || packageName;
    } catch { /* ignore */ }

    return {
      source: 'github',
      packageName,
      extractedPath: extractDir,
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
    };
  } catch (err) {
    cleanup(tempDir);
    throw new Error(`Failed to clone GitHub repo ${url}: ${err}`);
  }
}

async function fetchFromLocal(localPath: string, tempDir: string): Promise<FetchedPackage> {
  const stat = fs.statSync(localPath);
  let sourcePath = localPath;

  if (stat.isFile()) {
    // If it's a tarball, extract it
    if (localPath.endsWith('.tgz') || localPath.endsWith('.tar.gz')) {
      const extractDir = path.join(tempDir, 'package');
      fs.mkdirSync(extractDir, { recursive: true });
      await tar.x({ file: localPath, cwd: extractDir, strip: 1 });
      sourcePath = extractDir;
    } else {
      // Single file — put it in temp dir
      const fileDir = path.join(tempDir, 'package');
      fs.mkdirSync(fileDir, { recursive: true });
      fs.copyFileSync(localPath, path.join(fileDir, path.basename(localPath)));
      sourcePath = fileDir;
    }
  }

  // Try to get package name
  let packageName = path.basename(localPath);
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(sourcePath, 'package.json'), 'utf-8'));
    packageName = pkgJson.name || packageName;
  } catch { /* ignore */ }

  return {
    source: 'local',
    packageName,
    extractedPath: sourcePath,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

function cleanup(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}
