---
"sign-in-with-stacks": minor
---

Upgrade the better-auth plugin to better-auth 1.7 and harden the SIWS flow.

- Bump the `better-auth` peer dependency to `^1.7.0` (`deleteVerificationValue` was removed in better-auth 1.6, and `consumeVerificationValue` was added in 1.7)
- `POST /siws/verify` now takes `{ message, signature, email? }`; the wallet address, chain ID, nonce, and time bounds are read from the signed message instead of the request body
- Bind a caller-supplied email only when it is unclaimed and atomically reserved, falling back to a placeholder email instead of failing
- Generate placeholder emails at `siws.placeholder.invalid`, add an index on `walletAddress.userId`, rename the plugin id to `siws`, expose the plugin `version` and `options`, and register the plugin in `BetterAuthPluginRegistry`
