---
"sign-in-with-stacks": minor
---

Canonicalize Stacks addresses.

- `getAddress` now returns the canonical c32check address, and `isAddressEqual` compares canonical forms, so case and `O`/`I`/`L` confusable spellings of the same address are treated as equal
- The better-auth plugin canonicalizes the signed address before lookup and storage, so equivalent spellings resolve to a single wallet record instead of creating duplicate users
