---
"sign-in-with-stacks": minor
---

Upgrade the better-auth plugin to better-auth 1.7 and issue addressless, validated SIWS nonces.

- Bump the `better-auth` peer dependency to `^1.7.0` (`deleteVerificationValue` was removed in better-auth 1.6, and `consumeVerificationValue` was added in 1.7)
- `POST /siws/nonce` no longer accepts `walletAddress` or `chainId`; nonces are unbound from the wallet and validated as 8-250 alphanumeric characters
- Consume the nonce atomically by its signed value, so a nonce can only be used once even when verification requests race
- Add a `verifyMessage` option for custom signature verification; it defaults to the built-in Stacks verifier
