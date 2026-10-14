# Better Auth Plugin

The Better Auth plugin provides seamless integration between Sign-In with Stacks and [Better Auth](https://www.better-auth.com/), a modern authentication framework for TypeScript applications.

## Features

- 🔐 Secure nonce-based authentication flow
- 🍪 Automatic session management with cookies
- 🔗 Multi-chain wallet address support
- 👤 Anonymous and email-based authentication modes
- 💾 Database schema for wallet addresses with automatic migrations

## Installation

First, ensure you have both `sign-in-with-stacks` and `better-auth` installed:

::: code-group

```bash [npm]
npm install sign-in-with-stacks better-auth
```

```bash [pnpm]
pnpm add sign-in-with-stacks better-auth
```

```bash [yarn]
yarn add sign-in-with-stacks better-auth
```

:::

## Setup

### 1. Configure the Server Plugin

In your `auth.ts` (or wherever you configure Better Auth), add the SIWS plugin:

```ts
import { betterAuth } from "better-auth";
import { siws } from "sign-in-with-stacks/plugins/better-auth";

export const auth = betterAuth({
  // ... your other Better Auth configuration
  plugins: [
    siws({
      domain: "example.com",
      emailDomainName: "example.com", // optional
      anonymous: true, // optional, defaults to true
    }),
  ],
});
```

### 2. Run Database Migrations

The plugin adds a `walletAddress` table to your database. Run the Better Auth CLI to apply migrations:

```bash
npx auth@latest migrate
```

Or generate the schema to see the changes:

```bash
npx auth@latest generate
```

The plugin creates the following schema:

| Field       | Type      | Description                               |
| ----------- | --------- | ----------------------------------------- |
| `id`        | `string`  | Unique identifier                         |
| `userId`    | `string`  | Reference to the user                     |
| `address`   | `string`  | The Stacks wallet address                 |
| `chainId`   | `number`  | The SIP-005 chain ID                      |
| `isPrimary` | `boolean` | Whether this is the user's primary wallet |
| `createdAt` | `date`    | When the wallet was linked                |

### 3. Configure the Client Plugin

In your `auth-client.ts` (or wherever you create your auth client), add the SIWS client plugin:

```ts
import { createAuthClient } from "better-auth/client";
import { siwsClient } from "sign-in-with-stacks/plugins/better-auth/client";

export const authClient = createAuthClient({
  plugins: [siwsClient()],
});
```

## Usage

### Step 1: Request a Nonce

Before signing in, request a nonce from the server. This nonce is used to prevent replay attacks:

```ts
const { data, error } = await authClient.siws.nonce();

if (error) {
  console.error("Failed to get nonce:", error);
  return;
}

const { nonce } = data;
```

### Step 2: Create and Sign the Message

Use the nonce to create a SIWS message and request a signature from the user's wallet:

```ts
import { createSiwsMessage } from "sign-in-with-stacks";
import { STACKS_MAINNET } from "@stacks/network";
import { openSignatureRequestPopup } from "@stacks/connect";

const message = createSiwsMessage({
  address: "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
  chainId: STACKS_MAINNET.chainId,
  domain: "example.com",
  nonce: nonce, // Use the nonce from step 1
  uri: window.location.origin,
  version: "1",
  statement: "Sign in to Example App", // optional
});

await openSignatureRequestPopup({
  message,
  onFinish: async ({ signature }) => {
    // Proceed to step 3 with the signature
  },
});
```

### Step 3: Verify and Sign In

Send the message and signature to the server for verification:

```ts
const { data, error } = await authClient.siws.verify({
  message: message,
  signature: signature,
  email: "user@example.com", // optional, required if anonymous is false
});

if (error) {
  console.error("Sign in failed:", error);
  return;
}

console.log("Signed in successfully:", data.user);
```

## Configuration Options

### Server Plugin Options

| Option            | Type                                               | Required | Default            | Description                                                     |
| ----------------- | -------------------------------------------------- | -------- | ------------------ | --------------------------------------------------------------- |
| `domain`          | `string`                                           | Yes      | -                  | Your application's domain (e.g., `example.com`)                 |
| `emailDomainName` | `string`                                           | No       | Placeholder domain | Domain used for generating user emails in anonymous mode        |
| `anonymous`       | `boolean`                                          | No       | `true`             | Allow sign-in without requiring an email                        |
| `getNonce`        | `() => Promise<string>`                            | No       | Built-in           | Custom function to generate nonces (8+ alphanumeric characters) |
| `verifyMessage`   | `(args) => Promise<boolean>`                       | No       | Built-in           | Custom signature verification for the signed message            |
| `resolveProfile`  | `({ walletAddress }) => Promise<{ name, avatar }>` | No       | -                  | Resolve a display name and avatar for new wallet users          |
| `schema`          | `InferOptionSchema`                                | No       | -                  | Customize the `walletAddress` model name and columns            |
| `userIdStrategy`  | `"generated" \| "address"`                         | No       | `"generated"`      | Use the canonical Stacks address as `user.id` (see below)       |

### Anonymous Mode

When `anonymous` is `true` (default), users can sign in without providing an email. The plugin generates a placeholder email at `siws.placeholder.invalid` using the wallet address:

```
sp2x0tz59d5sz8acq6ymchhnr2zn51z32e2cj173@siws.placeholder.invalid
```

When `anonymous` is `false`, the `email` parameter is required in the `verify` call, and users must provide a valid email address. The email is only bound to the new account when it is not already claimed by another account; otherwise the placeholder email is used and the sign-in still succeeds.

### Custom Nonce Generation

You can provide your own nonce generation function for custom requirements:

```ts
import { betterAuth } from "better-auth";
import { siws } from "sign-in-with-stacks/plugins/better-auth";
import { randomBytes } from "crypto";

export const auth = betterAuth({
  plugins: [
    siws({
      domain: "example.com",
      getNonce: async () => {
        // Your custom nonce generation logic
        return randomBytes(32).toString("hex");
      },
    }),
  ],
});
```

### Custom Signature Verification

By default the plugin verifies the signature with the built-in Stacks verifier. Provide `verifyMessage` to use your own:

```ts
import { betterAuth } from "better-auth";
import { siws } from "sign-in-with-stacks/plugins/better-auth";

export const auth = betterAuth({
  plugins: [
    siws({
      domain: "example.com",
      verifyMessage: async ({ message, signature, address, chainId }) => {
        return myVerifier({ message, signature, address, chainId });
      },
    }),
  ],
});
```

### Profile Resolution

Use `resolveProfile` to set a display name and avatar on new wallet users, for example from BNS:

```ts
import { betterAuth } from "better-auth";
import { siws } from "sign-in-with-stacks/plugins/better-auth";

export const auth = betterAuth({
  plugins: [
    siws({
      domain: "example.com",
      resolveProfile: async ({ walletAddress }) => ({
        name: await lookupBnsName(walletAddress),
        avatar: await lookupAvatar(walletAddress),
      }),
    }),
  ],
});
```

### Custom Schema

Use `schema` to rename the `walletAddress` model or its columns. The override is merged with the plugin schema using better-auth's `mergeSchema`:

```ts
siws({
  domain: "example.com",
  schema: {
    walletAddress: {
      modelName: "wallet_address",
      fields: {
        userId: "user_id",
        address: "wallet_address",
        chainId: "chain_id",
        isPrimary: "is_primary",
        createdAt: "created_at",
      },
    },
  },
});
```

### User ID = Stacks Address

Set `userIdStrategy: "address"` to key users by their Stacks address instead of a generated id. This lets your own tables (profiles, posts, ...) reference a user by address.

```ts
siws({
  domain: "example.com",
  userIdStrategy: "address",
});
```

In this mode:

- **Identity**: `user.id` is the canonical address returned by `getAddress`. Every spelling of the same address (lowercase, `O`/`0`, `I`/`L`/`1`) resolves to the same user. Each user owns exactly one `walletAddress` row and one `siws` account.
- **Chain ID**: the first sign-in fixes the chain ID. A later sign-in for the same address with a different chain ID is rejected with `401` and code `UNAUTHORIZED_SIWS_CHAIN_ID_MISMATCH`, without creating rows or a session.
- **Claim**: if a user with `id` equal to the address already exists without a `walletAddress` row (for example, inserted by a data import), the first sign-in creates the missing `walletAddress` and `account` rows and signs in as that user.
- **Fixed at setup**: choose the strategy when you set up the plugin and keep it. The plugin does not look up or migrate users with generated ids; if you enable it on an existing database, migrating the data is your responsibility.
- **Concurrency**: concurrent first sign-ins for one address end with exactly one user, one `walletAddress` row, and one `account` row.

The mode requires string ids long enough to hold a Stacks address (41 characters). `advanced.database.generateId: "uuid"` and `"serial"` are rejected at startup. The default Better Auth schemas use `text` ids on PostgreSQL and SQLite; on MySQL and MSSQL they use `varchar(36)`, so widen the `user.id` column and the columns that reference it, as well as `account.id` and `walletAddress.id`.

Use `getAddress` from `sign-in-with-stacks` to normalize addresses exactly like the plugin before using them as user ids in your own tables.

## API Reference

### Server Endpoints

#### `POST /api/auth/siws/nonce`

Generates a nonce for the SIWS flow. The nonce is unbound from any wallet or chain; identity is taken from the signed message at verification time.

**Request Body:**

```json
{}
```

**Response:**

```json
{
  "nonce": "a1b2c3d4e5f6g7h8"
}
```

#### `POST /api/auth/siws/verify`

Verifies a signed SIWS message and creates a session. The wallet address, chain ID, nonce, and time bounds are read from the signed message.

**Request Body:**

```json
{
  "message": "example.com wants you to sign in with your Stacks account...",
  "signature": "0x...",
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "token": "session-token",
  "success": true,
  "user": {
    "id": "user-id",
    "walletAddress": "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
    "chainId": 1
  }
}
```

### Client Methods

#### `authClient.siws.nonce()`

Request a nonce for signing. Takes no parameters.

#### `authClient.siws.verify(options)`

Verify a signature and create a session.

| Parameter   | Type     | Required | Description                                   |
| ----------- | -------- | -------- | --------------------------------------------- |
| `message`   | `string` | Yes      | The SIWS message that was signed              |
| `signature` | `string` | Yes      | The signature from the wallet                 |
| `email`     | `string` | No       | User's email (required if anonymous is false) |

## Error Handling

The plugin returns structured errors that you can handle in your application:

```ts
const { data, error } = await authClient.siws.verify({
  // ...
});

if (error) {
  switch (error.code) {
    case "UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE":
      // Nonce expired, request a new one
      break;
    case "UNAUTHORIZED_SIWS_MESSAGE_MISMATCH":
      // Message does not match the expected domain, address, or chain ID
      break;
    case "UNAUTHORIZED_SIWS_CHAIN_ID_MISMATCH":
      // Address mode: the address is registered on a different chain ID
      break;
    case "UNAUTHORIZED_SIWS_MESSAGE_EXPIRED":
    case "UNAUTHORIZED_SIWS_MESSAGE_NOT_YET_VALID":
      // Message is outside its signed time bounds
      break;
    case "UNAUTHORIZED":
      // Invalid signature
      break;
    default:
      // Other error
      console.error(error.message);
  }
}
```

## Multi-Chain Support

The plugin supports multiple Stacks chains (mainnet, testnet). With the default `"generated"` user id strategy, when a user signs in with the same wallet address on a different chain, the plugin:

1. Links the new chain to the existing user account
2. Creates a new `walletAddress` record with the new `chainId`
3. Preserves the user's existing data and sessions

This allows users to seamlessly use the same account across different Stacks networks.
