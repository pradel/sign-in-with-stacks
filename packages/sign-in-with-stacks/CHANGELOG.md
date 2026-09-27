# sign-in-with-stacks

## 0.4.0

### Minor Changes

- [#24](https://github.com/pradel/sign-in-with-stacks/pull/24) [`3827e85`](https://github.com/pradel/sign-in-with-stacks/commit/3827e85bed7a9486492d6a33617f0a9fcee4bc29) Thanks [@pradel](https://github.com/pradel)! - Issue addressless, validated SIWS nonces.

  - `POST /siws/nonce` no longer accepts `walletAddress` or `chainId`; nonces are unbound from the wallet and validated as 8-250 alphanumeric characters
  - Consume the nonce atomically by its signed value, so a nonce can only be used once even when verification requests race

- [#31](https://github.com/pradel/sign-in-with-stacks/pull/31) [`8ce562d`](https://github.com/pradel/sign-in-with-stacks/commit/8ce562d281fc318185a14600c086af51f5015eca) Thanks [@pradel](https://github.com/pradel)! - Canonicalize Stacks addresses.

  - `getAddress` now returns the canonical c32check address, and `isAddressEqual` compares canonical forms, so case and `O`/`I`/`L` confusable spellings of the same address are treated as equal
  - The better-auth plugin canonicalizes the signed address before lookup and storage, so equivalent spellings resolve to a single wallet record instead of creating duplicate users

- [#28](https://github.com/pradel/sign-in-with-stacks/pull/28) [`dc00691`](https://github.com/pradel/sign-in-with-stacks/commit/dc0069108e2eaea6bf18efad21441a34e1810824) Thanks [@pradel](https://github.com/pradel)! - Add a `schema` option to the better-auth plugin.

  - Customize the `walletAddress` model name and columns; the override is merged with the plugin schema using better-auth's `mergeSchema`

- [#29](https://github.com/pradel/sign-in-with-stacks/pull/29) [`1c780df`](https://github.com/pradel/sign-in-with-stacks/commit/1c780df57172dcffa7d0792f3d833542d8a1ff51) Thanks [@pradel](https://github.com/pradel)! - Harden email provisioning in the better-auth plugin.

  - Generate placeholder emails at `siws.placeholder.invalid` instead of embedding the base URL origin
  - Bind a caller-supplied email only when it is unclaimed and atomically reserved, falling back to the placeholder email instead of failing

- [#30](https://github.com/pradel/sign-in-with-stacks/pull/30) [`7cb037b`](https://github.com/pradel/sign-in-with-stacks/commit/7cb037b8c71c3bd424b1af66ab0fe8371827d6d9) Thanks [@pradel](https://github.com/pradel)! - Polish better-auth plugin metadata.

  - Rename the plugin id from `sign-in-with-stacks` to `siws`, matching the client plugin
  - Expose the plugin `version` and `options`, and register the plugin in `BetterAuthPluginRegistry`
  - Add an index on `walletAddress.userId` and declare the client `pathMethods`

- [#27](https://github.com/pradel/sign-in-with-stacks/pull/27) [`7524a69`](https://github.com/pradel/sign-in-with-stacks/commit/7524a69ac3dca9a48083c3985f1efeb8fb5ae7aa) Thanks [@pradel](https://github.com/pradel)! - Add a `resolveProfile` option to the better-auth plugin.

  - New wallet users can be created with a display name and avatar resolved from the wallet address (for example from BNS)

- [#22](https://github.com/pradel/sign-in-with-stacks/pull/22) [`1bc5acc`](https://github.com/pradel/sign-in-with-stacks/commit/1bc5acccf88205565663494ba337acec1e745a98) Thanks [@pradel](https://github.com/pradel)! - Upgrade the better-auth plugin to better-auth 1.7.

  - Bump the `better-auth` peer dependency to `^1.7.0` (`deleteVerificationValue` was removed in better-auth 1.6, and `consumeVerificationValue` was added in 1.7)

- [#24](https://github.com/pradel/sign-in-with-stacks/pull/24) [`3827e85`](https://github.com/pradel/sign-in-with-stacks/commit/3827e85bed7a9486492d6a33617f0a9fcee4bc29) Thanks [@pradel](https://github.com/pradel)! - Read the SIWS wallet identity from the signed message.

  - `POST /siws/verify` now takes `{ message, signature, email? }`; the wallet address, chain ID, nonce, and time bounds are read from the signed message instead of the request body

- [#24](https://github.com/pradel/sign-in-with-stacks/pull/24) [`3827e85`](https://github.com/pradel/sign-in-with-stacks/commit/3827e85bed7a9486492d6a33617f0a9fcee4bc29) Thanks [@pradel](https://github.com/pradel)! - Add a `verifyMessage` option to the better-auth plugin.

  - Custom signature verification for the signed message; it defaults to the built-in Stacks verifier

## 0.3.1

### Patch Changes

- [#20](https://github.com/pradel/sign-in-with-stacks/pull/20) [`c05b47f`](https://github.com/pradel/sign-in-with-stacks/commit/c05b47f429df0a6453ffaa542ff3624482fad483) Thanks [@pradel](https://github.com/pradel)! - Harden message parsing and validation with fixes ported from viem's SIWE implementation.

  - Reject unparseable `Expiration Time`, `Not Before`, and `Issued At` timestamps, and invalid `time` inputs, instead of silently skipping lifetime checks
  - Validate `message.address` in `validateSiwsMessage` when no expected `address` is passed
  - Reject commas in URI schemes in `createSiwsMessage` and `parseSiwsMessage`
  - Parse `resources` only from the `Resources:` section

## 0.3.0

### Minor Changes

- [#17](https://github.com/pradel/sign-in-with-stacks/pull/17) [`abb4a6b`](https://github.com/pradel/sign-in-with-stacks/commit/abb4a6bc9ede7f56005ed095bb1670098636f6a7) Thanks [@pradel](https://github.com/pradel)! - Fix chain ID validation to support the full SIP-005 unsigned 32-bit range, allowing `STACKS_TESTNET` chain ID (`2147483648`) to work correctly.
  - `createSiwsMessage` now validates that `chainId` is a positive 32-bit unsigned integer (1 to 4294967295)
  - Better-auth plugin zod schema updated from `.max(2147483647)` to `.max(4294967295)` on both nonce and verify endpoints
  - Better-auth plugin `walletAddress.chainId` database field now uses `bigint` to avoid PostgreSQL integer overflow

## 0.2.0

### Minor Changes

- [#15](https://github.com/pradel/sign-in-with-stacks/pull/15) [`ef736a1`](https://github.com/pradel/sign-in-with-stacks/commit/ef736a1e59bef2140fa6256508ffeddb210232c4) Thanks [@pradel](https://github.com/pradel)! - Add better-auth plugin

- [`650d3f7`](https://github.com/pradel/sign-in-with-stacks/commit/650d3f716145cd361b512d4e350eefd75692dfc8) Thanks [@pradel](https://github.com/pradel)! - Add documentation website.

### Patch Changes

- [#13](https://github.com/pradel/sign-in-with-stacks/pull/13) [`5c5816f`](https://github.com/pradel/sign-in-with-stacks/commit/5c5816f3940cf5be0c0c27729d82d95b697a0068) Thanks [@pradel](https://github.com/pradel)! - Add Next.js + NextAuth.js example

- [#15](https://github.com/pradel/sign-in-with-stacks/pull/15) [`ef736a1`](https://github.com/pradel/sign-in-with-stacks/commit/ef736a1e59bef2140fa6256508ffeddb210232c4) Thanks [@pradel](https://github.com/pradel)! - Add Next.js + better-auth example

## 0.1.6

### Patch Changes

- [`ab45405`](https://github.com/pradel/sign-in-with-stacks/commit/ab454051935ef419be668217e86dcbcfc797bb45) Thanks [@pradel](https://github.com/pradel)! - Add docs README.md to npm

## 0.1.5

### Patch Changes

- [#10](https://github.com/pradel/sign-in-with-stacks/pull/10) [`83a8f5f`](https://github.com/pradel/sign-in-with-stacks/commit/83a8f5fed63744cf61c3fe4ed4ecf68479d17572) Thanks [@pradel](https://github.com/pradel)! - Setup monorepo

## 0.1.4

### Patch Changes

- c534d23: Setup trusted publishing for npm

## 0.1.3

### Patch Changes

- a0d333f: Setup trusted publishing for npm
- e5d774b: Setup publint when building

## 0.1.2

### Patch Changes

- 2e1912e: Isolated declarations in build.

## 0.1.1

### Patch Changes

- 76b4cf2: Fix release files.

## 0.1.0

### Minor Changes

- 6848a46: First release.
