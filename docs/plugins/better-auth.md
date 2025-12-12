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
npx @better-auth/cli migrate
```

Or generate the schema to see the changes:

```bash
npx @better-auth/cli generate
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
const { data, error } = await authClient.siws.nonce({
  walletAddress: "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
  chainId: 1, // optional, defaults to Stacks mainnet (1)
});

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
  walletAddress: "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
  chainId: 1, // optional, defaults to Stacks mainnet (1)
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

| Option            | Type                    | Required | Default  | Description                                              |
| ----------------- | ----------------------- | -------- | -------- | -------------------------------------------------------- |
| `domain`          | `string`                | Yes      | -        | Your application's domain (e.g., `example.com`)          |
| `emailDomainName` | `string`                | No       | Base URL | Domain used for generating user emails in anonymous mode |
| `anonymous`       | `boolean`               | No       | `true`   | Allow sign-in without requiring an email                 |
| `getNonce`        | `() => Promise<string>` | No       | Built-in | Custom function to generate nonces                       |

### Anonymous Mode

When `anonymous` is `true` (default), users can sign in without providing an email. The plugin will generate a placeholder email using the wallet address:

```
SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173@example.com
```

When `anonymous` is `false`, the `email` parameter is required in the `verify` call, and users must provide a valid email address.

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

## API Reference

### Server Endpoints

#### `POST /api/auth/siws/nonce`

Generates a nonce for the SIWS flow.

**Request Body:**

```json
{
  "walletAddress": "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
  "chainId": 1
}
```

**Response:**

```json
{
  "nonce": "a1b2c3d4e5f6g7h8"
}
```

#### `POST /api/auth/siws/verify`

Verifies a signed SIWS message and creates a session.

**Request Body:**

```json
{
  "walletAddress": "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
  "message": "example.com wants you to sign in with your Stacks account...",
  "signature": "0x...",
  "chainId": 1,
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

#### `authClient.siws.nonce(options)`

Request a nonce for signing.

| Parameter       | Type     | Required | Description                    |
| --------------- | -------- | -------- | ------------------------------ |
| `walletAddress` | `string` | Yes      | The user's Stacks address      |
| `chainId`       | `number` | No       | Chain ID (defaults to mainnet) |

#### `authClient.siws.verify(options)`

Verify a signature and create a session.

| Parameter       | Type     | Required | Description                                   |
| --------------- | -------- | -------- | --------------------------------------------- |
| `walletAddress` | `string` | Yes      | The user's Stacks address                     |
| `message`       | `string` | Yes      | The SIWS message that was signed              |
| `signature`     | `string` | Yes      | The signature from the wallet                 |
| `chainId`       | `number` | No       | Chain ID (defaults to mainnet)                |
| `email`         | `string` | No       | User's email (required if anonymous is false) |

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

The plugin supports multiple Stacks chains (mainnet, testnet). When a user signs in with the same wallet address on a different chain, the plugin:

1. Links the new chain to the existing user account
2. Creates a new `walletAddress` record with the new `chainId`
3. Preserves the user's existing data and sessions

This allows users to seamlessly use the same account across different Stacks networks.
