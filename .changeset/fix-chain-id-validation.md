---
"sign-in-with-stacks": minor
---

Fix chain ID validation to support the full SIP-005 unsigned 32-bit range, allowing `STACKS_TESTNET` chain ID (`2147483648`) to work correctly.

- `createSiwsMessage` now validates that `chainId` is a positive 32-bit unsigned integer (1 to 4294967295)
- Better-auth plugin zod schema updated from `.max(2147483647)` to `.max(4294967295)` on both nonce and verify endpoints
- Better-auth plugin `walletAddress.chainId` database field now uses `bigint` to avoid PostgreSQL integer overflow
