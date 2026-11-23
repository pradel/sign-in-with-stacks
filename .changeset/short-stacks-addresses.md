---
"sign-in-with-stacks": patch
---

Parse SIWS messages for addresses shorter than 40 characters. `parseSiwsMessage` only read addresses of 40 or 41 characters, but c32check addresses are shorter when their hash starts with zero bits, such as the 39-character addresses of about 1 in 256 wallets. Messages for those wallets had no address once parsed, so `verifySiwsMessage` returned `false` for valid signatures and the better-auth plugin rejected the sign-in.
