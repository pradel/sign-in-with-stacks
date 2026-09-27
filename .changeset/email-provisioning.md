---
"sign-in-with-stacks": minor
---

Harden email provisioning in the better-auth plugin.

- Generate placeholder emails at `siws.placeholder.invalid` instead of embedding the base URL origin
- Bind a caller-supplied email only when it is unclaimed and atomically reserved, falling back to the placeholder email instead of failing
