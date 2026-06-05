# AGENTS.md — mcp-audit

> Constitution for agents working on this repo.

## What this repo is

A security scanner for MCP servers. Static analysis tool. TypeScript CLI.

## What this repo is NOT

- Not a hosted SaaS
- Not a registry
- Not a code formatter or linter
- Do not execute MCP server code (static analysis only in v0.1)

## Sovereignty rules

1. No hardcoded API keys or vendor URLs
2. No telemetry, no phone-home
3. Works offline — all analysis is local
4. No proprietary export formats (JSON, SARIF are open standards)

## Scope boundaries

### In scope
- AST-based static analysis of TS/JS MCP servers
- Security pattern detection
- Terminal, JSON, SARIF reporting
- npm / GitHub / local package fetching

### Out of scope
- Dynamic execution / sandbox testing (v0.5)
- Auto-fixing servers (v1.0)
- Real-time monitoring (v1.0)
- Python server analysis in v0.1 (add in v0.5)

## Testing requirements

- Every analyzer rule must have a unit test
- Every output format must have a unit test
- Integration tests must cover at least 2 real npm packages
- CI must be green before merge

## No-nos

1. No executing untrusted code
2. No bundling vulnerability databases (use external advisories in v0.5)
3. No false-negative guarantees (document limitations honestly)
