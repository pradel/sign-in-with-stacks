# AGENTS.md

## Overview

Sign-in with Stacks is a library for creating and verifying Sign-In with Stacks (SIWS) messages, with a better-auth plugin. It is a pnpm + Turbo monorepo using tsdown, Vitest, oxlint, and Prettier.

## Structure

- `packages/sign-in-with-stacks` - Main library, better-auth plugin, and tests
- `examples/better-auth` - Next.js + better-auth example
- `examples/next-auth` - Next.js + NextAuth.js example
- `docs` - VitePress documentation site

## Key Commands

These commands should be run from the monorepo root.

```bash
# Install dependencies
pnpm install

# Sync vendored reference repositories (viem and better-auth)
pnpm repos:sync

# Build all packages
pnpm build

# Format / check formatting
pnpm format
pnpm format:check

# Lint
pnpm lint

# Check types
pnpm check-types

# Run all tests
pnpm test

# Run tests for the main package
pnpm --filter sign-in-with-stacks test
```

## Vendored Repositories

This project vendors external repositories under `repos/` (gitignored):

- If `repos/viem` or `repos/better-auth` is missing or empty, run `pnpm repos:sync` to clone/update the vendored repositories
- Use vendored repositories as read-only reference material when working with viem or better-auth
- Prefer examples and patterns from the vendored source code over generated guesses or web search results
- Do not edit files under `repos/` unless explicitly asked
- Do not import from `repos/` - application code should continue importing from normal package dependencies
- This library is a port of viem's SIWE implementation. Inspect `repos/viem/` for reference implementations of message creation, parsing, validation, and verification when working on the core library
- When writing better-auth code, inspect `repos/better-auth/` for plugin APIs, tests, module structure, and idiomatic usage. Treat it as the source of truth for better-auth patterns
