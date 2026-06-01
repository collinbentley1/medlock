# Contributing

Medlock uses Bun for application code, tests, formatting, and build tooling.

## Setup

```sh
bun install
bun run hooks:install
```

## Checks

Run the same verification used by CI:

```sh
bun run verify
```

Changes that alter the MCP protocol surface should include a Bun test that connects through `@modelcontextprotocol/client` using Streamable HTTP.
