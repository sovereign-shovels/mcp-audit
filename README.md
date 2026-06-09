# mcp-audit

> `npm audit` for Model Context Protocol servers.

`mcp-audit` is a static security scanner for MCP servers. It downloads, parses, and analyzes server source code without ever executing it — so you can catch dangerous patterns before you install.

## Install

```bash
npm install -g mcp-audit
```

## Usage

```bash
# Scan an npm package
mcp-audit scan @modelcontextprotocol/server-filesystem

# Scan a GitHub repo
mcp-audit scan https://github.com/modelcontextprotocol/servers --json

# Scan a local path
mcp-audit scan ./my-mcp-server --sarif
```

### Output formats

- **Terminal table** (default)
- **JSON** (`--json`)
- **SARIF v2.1** (`--sarif`)

## Scoring Guide

| Grade | Meaning | Criteria |
|-------|---------|----------|
| **A** | Safe | No medium+ findings |
| **B** | Caution | Low or a few medium findings |
| **C** | Risky | High findings present |
| **F** | Dangerous | Critical findings or 3+ high findings |

## What it detects

- **Filesystem**: uncontrolled `fs.writeFile`, `fs.rm`, `fs.readFile`
- **Shell**: `child_process.exec`, unvalidated `spawn`
- **Network**: `fetch` to user-controlled URLs without allowlists
- **Secrets**: reading `process.env.*KEY*`, `.env` files
- **Code execution**: `eval`, `new Function`, `vm.runInContext`

## FAQ

**Does it execute the MCP server?**

No. Static analysis only. We never run the code we scan.

**Does it phone home?**

No telemetry, no required sign-up. Default endpoint is localhost:11434 (Ollama) for optional LLM features. BYO API key.

## License

Apache 2.0

> Disclaimer: This is a community project and is not affiliated with Anthropic.
