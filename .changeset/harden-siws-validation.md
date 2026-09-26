---
"sign-in-with-stacks": patch
---

Harden message parsing and validation with fixes ported from viem's SIWE implementation.

- Reject unparseable `Expiration Time`, `Not Before`, and `Issued At` timestamps, and invalid `time` inputs, instead of silently skipping lifetime checks
- Validate `message.address` in `validateSiwsMessage` when no expected `address` is passed
- Reject commas in URI schemes in `createSiwsMessage` and `parseSiwsMessage`
- Parse `resources` only from the `Resources:` section
