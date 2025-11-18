import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { generateSiwsNonce } from "sign-in-with-stacks";
import z from "zod";

/**
 * Mock what we have on the server so that the client can have proper types
 */
export const betterAuthSiws = () =>
  ({
    id: "sign-in-with-stacks",
    endpoints: {
      nonce: createAuthEndpoint(
        "/siws/nonce",
        {
          method: "POST",
          body: z.object({
            walletAddress: z.string(),
          }),
        },
        async (ctx) => {
          const nonce = generateSiwsNonce();

          // Store nonce with 15-minute expiration
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `siws:${ctx.body.walletAddress.toLowerCase()}`,
            value: nonce,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          });

          return ctx.json({ nonce });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
