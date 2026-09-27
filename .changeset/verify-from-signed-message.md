---
"sign-in-with-stacks": minor
---

Read the SIWS wallet identity from the signed message.

- `POST /siws/verify` now takes `{ message, signature, email? }`; the wallet address, chain ID, nonce, and time bounds are read from the signed message instead of the request body
