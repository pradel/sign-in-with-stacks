# Plugins

Sign-In with Stacks provides official plugins for popular authentication frameworks, making it easy to integrate wallet-based authentication into your application.

## Available Plugins

### [Better Auth](/plugins/better-auth)

A full-featured authentication plugin for [Better Auth](https://www.better-auth.com/). This plugin provides:

- Automatic nonce generation and verification
- Session management with cookies
- Multi-chain wallet address support
- Anonymous and email-based authentication modes
- Database schema for storing wallet addresses

[Get started with Better Auth →](/plugins/better-auth)

## Community Plugins

Have you created a plugin for Sign-In with Stacks? [Open a PR](https://github.com/pradel/sign-in-with-stacks) to add it here!

## Building Your Own Plugin

Sign-In with Stacks is framework-agnostic and can be integrated with any authentication system. The core library provides:

- `createSiwsMessage` - Create a SIP-X formatted message for signing
- `generateSiwsNonce` - Generate a cryptographically secure nonce
- `verifySiwsMessage` - Verify a signed SIWS message
- `validateSiwsMessage` - Validate message fields without signature verification

See the [Getting Started guide](/) for basic usage, then adapt the flow to your authentication framework of choice.
