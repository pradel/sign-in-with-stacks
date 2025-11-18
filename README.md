# sign-in-with-stacks

Sign-in with Stacks is a library for creating and verifying Sign-In with Stacks messages.

## Installation

```
npm install sign-in-with-stacks
```

## Usage

On the client create a message and sign it with the user's wallet.

```ts
import { createSiwsMessage, generateSiwsNonce } from "sign-in-with-stacks";
import { STACKS_MAINNET } from "@stacks/network";
import { openSignatureRequestPopup } from "@stacks/connect";

const message = createSiwsMessage({
  address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  chainId: STACKS_MAINNET.chainId,
  domain: "example.com",
  nonce: generateSiwsNonce(),
  uri: "https://example.com/path",
  version: "1",
});

await openSignatureRequestPopup({
  message,
  onFinish: async ({ signature }) => {
    // Pass the signature to your backend
  },
});
```

On the backend verify the signature, can be used with any framework, next-auth, better-auth, express, etc.

```ts
import { verifySiwsMessage } from "sign-in-with-stacks";
import { STACKS_MAINNET } from "@stacks/network";

const valid = verifySiwsMessage({
  message,
  signature,
  nonce: "your-nonce",
});
```

## better-auth usage

A SIWS plugin is available for better-auth.

1. In you `auth.ts` file:

```ts
import { betterAuth } from "better-auth";
import { sisw } from "sign-in-with-stacks/better-auth";

export const auth = betterAuth({
  plugins: [
    sisw({
      domain: "example.com",
      emailDomainName: "example.com", // optional
    }),
  ],
});
```

2. Run the migration or generate the schema to add the necessary fields and tables to the database.

```bash
npx @better-auth/cli migrate
```

3. In you `auth-client.ts` file:

```ts
import { createAuthClient } from "better-auth/client";
import { siwsClient } from "sign-in-with-stacks/better-auth";

export const authClient = createAuthClient({
  plugins: [siwsClient()],
});
```

4. On the client, generate a nonce:

```ts
const { data, error } = await authClient.siws.nonce({
  walletAddress: "your-user-wallet-address",
});

if (data) {
  console.log("Nonce:", data.nonce);
}
```

5. On the client, sign in with SIWS:

```ts
const { data, error } = await authClient.siwe.verify({
  message: "Your SIWS message string",
  signature: "0x...", // The signature from the user's wallet
  walletAddress: "your-user-wallet-address",
  email: "user@example.com", // optional, required if anonymous is false
});

if (data) {
  console.log("Authentication successful:", data.user);
}
```

## Examples

- [Next.js + better-auth](./examples/better-auth)
- [Next.js + NextAuth.js](./examples/next-auth)

## Credits

The first version of this library is a port of the view siwe implementation.
