# sign-in-with-stacks/plugins/better-auth

A SIWS plugin for better-auth.

## Usage

1. In you `auth.ts` file:

```ts
import { betterAuth } from "better-auth";
import { siws } from "sign-in-with-stacks/plugins/better-auth";

export const auth = betterAuth({
  plugins: [
    siws({
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
import { siwsClient } from "sign-in-with-stacks/plugins/better-auth/client";

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
const { data, error } = await authClient.siws.verify({
  message: "Your SIWS message string",
  signature: "0x...", // The signature from the user's wallet
  walletAddress: "your-user-wallet-address",
  email: "user@example.com", // optional, required if anonymous is false
});

if (data) {
  console.log("Authentication successful:", data.user);
}
```
