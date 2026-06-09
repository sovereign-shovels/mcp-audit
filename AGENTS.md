# AGENTS.md — mcp-audit

## Project Context

`mcp-audit` is a TypeScript CLI security scanner for MCP (Model Context Protocol) servers.
It is part of the sovereign-shovels open-source portfolio.

## Universal No-Nos

1. Never commit secrets, API keys, or credentials.
2. Never add telemetry, analytics, or phone-home behavior.
3. Never require sign-up or user accounts.
4. Never hardcode endpoints other than localhost defaults.
5. Never execute scanned MCP server code.
6. Never trust a scanned package; treat all as untrusted.
7. Never introduce non-optional proprietary dependencies.
8. Never break the local-first, BYO-key philosophy.
9. Never ship with failing tests.
10. Never ignore TypeScript strict mode.
11. Never use `any` without a documented exception.
12. Never add unused dependencies.
13. Never modify test expectations to make tests pass.
14. Never release without updating the changelog/version.
15. Never disable security lint rules.
16. Never use `eval` or dynamic code execution in our own code.
17. Never assume the user's environment has unsafe defaults.
18. Never block users from opting out of any optional network call.

## Additional Rules

- **Static analysis only in v0.1.** Never execute MCP server code.
- All scanned packages are treated as untrusted.
- Keep the CLI deterministic and reproducible.
- Maintain >80% test coverage on the analyzer core.
