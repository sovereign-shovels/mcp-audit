# mcp-audit

> Security scanner for MCP servers — catch the sketchy ones before you install them.

```bash
mcp-audit scan @modelcontextprotocol/server-filesystem
mcp-audit scan https://github.com/user/mcp-server --format json
mcp-audit scan ./my-mcp-server --format sarif --output report.json
```

## Install

```bash
npm install -g mcp-audit
```

Or run without installing:

```bash
npx mcp-audit scan <package>
```

## Why this exists

MCP (Model Context Protocol) servers can read your files, run shell commands, and make network requests. Installing one is essentially `curl | bash` with extra steps. `mcp-audit` tells you what a server can do **before** you give it access to your machine.

## What it checks

| Category | Detected Patterns | Severity |
|----------|------------------|----------|
| **Filesystem** | Unrestricted write, delete, read without validation | Critical / High |
| **Shell** | `exec`, `spawn`, `execSync` with user input | Critical |
| **Network** | `fetch` / `axios` to user-controlled URLs | High |
| **Secrets** | Reading `SECRET_*`, `API_KEY`, `.env` files | Medium |
| **Code Execution** | `eval`, `new Function()`, `vm.runInContext` | Critical |

## Grading

| Grade | Meaning |
|-------|---------|
| **A** | No dangerous patterns detected |
| **B** | Minor concerns (medium-severity findings) |
| **C** | Multiple risky patterns |
| **F** | Critical security issues — review before installing |

## Usage

### Scan an npm package

```bash
mcp-audit scan @modelcontextprotocol/server-filesystem
```

### Scan a GitHub repo

```bash
mcp-audit scan https://github.com/modelcontextprotocol/servers
```

### Scan a local project

```bash
mcp-audit scan ./my-mcp-server
```

### Output formats

```bash
# Terminal (default)
mcp-audit scan <package>

# JSON
mcp-audit scan <package> --format json

# SARIF (for CI integration)
mcp-audit scan <package> --format sarif --output report.sarif
```

### CI integration

Exit code is `1` if grade is **F**, so you can gate installs:

```bash
mcp-audit scan $MCP_PACKAGE || echo "Security check failed"
```

## Limitations

- **Static analysis only** — we analyze source code, we don't run the server. Some issues may only appear at runtime.
- **Best-effort detection** — false positives and false negatives are possible. Always review findings manually.
- **Path validation** — we flag all file operations; a filesystem server will naturally show file-related findings. Check if the server validates paths before trusting the grade blindly.

## Tested MCP servers

| Server | Grade | Notes |
|--------|-------|-------|
| `@modelcontextprotocol/server-github` | B | Network requests to GitHub API (expected) |
| `@modelcontextprotocol/server-filesystem` | F | File write/delete (expected for a filesystem server) |

## License

Apache 2.0
