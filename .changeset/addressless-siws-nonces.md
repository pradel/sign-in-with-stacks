---
"sign-in-with-stacks": minor
---

Issue addressless, validated SIWS nonces.

- `POST /siws/nonce` no longer accepts `walletAddress` or `chainId`; nonces are unbound from the wallet and validated as 8-250 alphanumeric characters
- Consume the nonce atomically by its signed value, so a nonce can only be used once even when verification requests race
