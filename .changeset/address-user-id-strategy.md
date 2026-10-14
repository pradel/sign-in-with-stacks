---
"sign-in-with-stacks": minor
---

Add an address-as-user-id mode to the better-auth plugin.

- New `userIdStrategy: "address"` option makes `user.id` the canonical Stacks address: one user per address, with the chain id fixed by the first sign-in or provision. A sign-in with a different chain id is rejected with `UNAUTHORIZED_SIWS_CHAIN_ID_MISMATCH`. The strategy is meant to be fixed at setup; existing generated-id users are not migrated. The default `"generated"` strategy is unchanged
- New server-only `auth.api.provisionUser({ body: { address, chainId } })` creates a wallet user ahead of its first sign-in, without a session; a later SIWS sign-in claims it
- `getAddress` is now exported from the package root so apps can normalize addresses exactly like the plugin
