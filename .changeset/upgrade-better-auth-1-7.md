---
"sign-in-with-stacks": minor
---

Upgrade the better-auth plugin to better-auth 1.7 and consume SIWS nonces atomically.

- Bump the `better-auth` peer dependency to `^1.7.0` (`deleteVerificationValue` was removed in better-auth 1.6, and `consumeVerificationValue` was added in 1.7)
- Consume the SIWS nonce with `internalAdapter.consumeVerificationValue`, so a nonce can only be used once even when verification requests race
