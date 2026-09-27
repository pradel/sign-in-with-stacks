---
"sign-in-with-stacks": minor
---

Upgrade the better-auth plugin to better-auth 1.7 and harden the SIWS flow.

- Bump the `better-auth` peer dependency to `^1.7.0` (`deleteVerificationValue` was removed in better-auth 1.6, and `consumeVerificationValue` was added in 1.7)
- `POST /siws/verify` now takes `{ message, signature, email? }`; the wallet address, chain ID, nonce, and time bounds are read from the signed message instead of the request body
