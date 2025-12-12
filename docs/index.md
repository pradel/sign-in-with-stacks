# Getting Started

Sign-In with Stacks is a library for creating and verifying Sign-In with Stacks (SIWS) messages. It enables decentralized authentication using Stacks wallets, following the [SIP-X specification](https://github.com/stacksgov/sips/pull/70).

## Installation

Install the package using your preferred package manager:

::: code-group

```bash [npm]
npm install sign-in-with-stacks
```

```bash [pnpm]
pnpm add sign-in-with-stacks
```

```bash [yarn]
yarn add sign-in-with-stacks
```

:::

## Usage

### Client-Side: Creating and Signing a Message

On the client, create a SIWS message and sign it with the user's wallet using `@stacks/connect`:

```ts
import { createSiwsMessage, generateSiwsNonce } from "sign-in-with-stacks";
import { STACKS_MAINNET } from "@stacks/network";
import { openSignatureRequestPopup } from "@stacks/connect";

// Create the SIWS message
const message = createSiwsMessage({
  address: "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
  chainId: STACKS_MAINNET.chainId,
  domain: "example.com",
  nonce: generateSiwsNonce(),
  uri: "https://example.com/path",
  version: "1",
});

// Request signature from user's wallet
await openSignatureRequestPopup({
  message,
  onFinish: async ({ signature }) => {
    // Send the message and signature to your backend for verification
    await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
  },
});
```

### Server-Side: Verifying the Signature

On the backend, verify the signature to authenticate the user:

```ts
import { verifySiwsMessage } from "sign-in-with-stacks";

const valid = verifySiwsMessage({
  message,
  signature,
  address: "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
  domain: "example.com",
  nonce: "your-stored-nonce",
});

if (valid) {
  // Authentication successful - create a session for the user
} else {
  // Authentication failed
}
```

## Message Parameters

The `createSiwsMessage` function accepts the following parameters:

| Parameter        | Type       | Required | Description                                                               |
| ---------------- | ---------- | -------- | ------------------------------------------------------------------------- |
| `address`        | `string`   | Yes      | The Stacks address performing the signing                                 |
| `chainId`        | `number`   | Yes      | The SIP-005 Chain ID (e.g., `1` for mainnet)                              |
| `domain`         | `string`   | Yes      | RFC 3986 authority requesting the signing (e.g., `example.com`)           |
| `nonce`          | `string`   | Yes      | A random string to prevent replay attacks (min 8 alphanumeric characters) |
| `uri`            | `string`   | Yes      | RFC 3986 URI referring to the resource that is the subject of the signing |
| `version`        | `"1"`      | Yes      | The current version of the SIWS message (must be `"1"`)                   |
| `statement`      | `string`   | No       | A human-readable message the user will sign                               |
| `expirationTime` | `Date`     | No       | When the signed message is no longer valid                                |
| `issuedAt`       | `Date`     | No       | When the message was generated (defaults to current time)                 |
| `notBefore`      | `Date`     | No       | When the signed message will become valid                                 |
| `requestId`      | `string`   | No       | A system-specific identifier for the sign-in request                      |
| `resources`      | `string[]` | No       | List of URIs the user wishes to have resolved during authentication       |
| `scheme`         | `string`   | No       | RFC 3986 URI scheme of the origin of the request                          |

## Verification Parameters

The `verifySiwsMessage` function accepts the following parameters:

| Parameter   | Type     | Required | Description                                                     |
| ----------- | -------- | -------- | --------------------------------------------------------------- |
| `message`   | `string` | Yes      | The SIP-X formatted message string                              |
| `signature` | `string` | Yes      | The signature from the user's wallet                            |
| `address`   | `string` | No       | Expected Stacks address (validates against message if provided) |
| `domain`    | `string` | No       | Expected domain (validates against message if provided)         |
| `nonce`     | `string` | No       | Expected nonce (validates against message if provided)          |
| `scheme`    | `string` | No       | Expected URI scheme (validates against message if provided)     |
| `time`      | `Date`   | No       | Time to check expiration against (defaults to current time)     |

## Framework Integrations

Sign-In with Stacks can be integrated with any authentication framework. We provide official plugins for popular solutions:

- [Better Auth Plugin](/plugins/better-auth) - Full-featured authentication plugin for Better Auth

## Examples

Check out our example implementations:

- [Next.js + Better Auth](https://github.com/pradel/sign-in-with-stacks/tree/main/examples/better-auth)
- [Next.js + NextAuth.js](https://github.com/pradel/sign-in-with-stacks/tree/main/examples/next-auth)
