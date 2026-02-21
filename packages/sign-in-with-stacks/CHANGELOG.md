# sign-in-with-stacks

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
