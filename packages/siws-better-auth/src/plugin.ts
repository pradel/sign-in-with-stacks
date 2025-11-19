import type { BetterAuthPlugin, User } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { generateSiwsNonce, verifySiwsMessage } from "sign-in-with-stacks";
import z from "zod";
import { schema } from "./schema.js";
import type { WalletAddress } from "./types.js";

export interface SIWSPluginOptions {
  // The domain name of your application (required for SIWS message generation)
  domain: string;
  // The email domain name for creating user accounts when not using anonymous mode. Defaults to the domain from your base URL
  emailDomainName?: string | undefined;
  // Whether to allow anonymous sign-ins without requiring an email. Default is true
  anonymous?: boolean | undefined;
  // Function to generate a unique nonce for each sign-in attempt. You must implement this function to return a cryptographically secure random string. Must return a Promise<string>
  getNonce?: () => Promise<string>;
}

export const siws = (options: SIWSPluginOptions) =>
  ({
    id: "sign-in-with-stacks",
    schema: schema,
    endpoints: {
      nonce: createAuthEndpoint(
        "/siws/nonce",
        {
          method: "POST",
          body: z.object({
            // TODO Stacks address regex
            walletAddress: z.string(),
            chainId: z
              .number()
              .int()
              .positive()
              .max(2147483647)
              .optional()
              .default(0x00000001), // Default to Stacks mainnet
          }),
        },
        async (ctx) => {
          const { walletAddress, chainId } = ctx.body;
          const nonce = options.getNonce
            ? await options.getNonce()
            : generateSiwsNonce();

          // Store nonce with 15-minute expiration
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `siws:${walletAddress.toLowerCase()}:${chainId}`,
            value: nonce,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          });

          return ctx.json({ nonce });
        },
      ),

      verify: createAuthEndpoint(
        "/siws/verify",
        {
          method: "POST",
          body: z
            .object({
              // TODO Stacks address regex
              walletAddress: z.string().min(1),
              message: z.string().min(1),
              signature: z.string().min(1),
              chainId: z
                .number()
                .int()
                .positive()
                .max(2147483647)
                .optional()
                .default(0x00000001), // Default to Stacks mainnet
              email: z.email().optional(),
            })
            .refine((data) => options.anonymous !== false || !!data.email, {
              message:
                "Email is required when the anonymous plugin option is disabled.",
              path: ["email"],
            }),
          requireRequest: true,
        },
        async (ctx) => {
          const { walletAddress, message, signature, chainId, email } =
            ctx.body;
          const isAnon = options.anonymous ?? true;

          if (!isAnon && !email) {
            throw new APIError("BAD_REQUEST", {
              message: "Email is required when anonymous is disabled.",
              status: 400,
            });
          }

          try {
            // Find stored nonce with wallet address and chain ID context
            const verification =
              await ctx.context.internalAdapter.findVerificationValue(
                `siws:${walletAddress.toLowerCase()}:${chainId}`,
              );

            // Ensure nonce is valid and not expired
            if (!verification || new Date() > verification.expiresAt) {
              throw new APIError("UNAUTHORIZED", {
                message: "Unauthorized: Invalid or expired nonce",
                status: 401,
                code: "UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE",
              });
            }

            // Verify SIWS message
            const { value: nonce } = verification;
            const valid = verifySiwsMessage({
              message,
              signature,
              address: walletAddress,
              domain: options.domain,
              nonce,
            });

            if (!valid) {
              throw new APIError("UNAUTHORIZED", {
                message: "Unauthorized: Invalid SIWS signature",
                status: 401,
              });
            }

            // Clean up used nonce
            await ctx.context.internalAdapter.deleteVerificationValue(
              verification.id,
            );

            // Look for existing user by their wallet addresses
            let user: User | null = null;

            // Check if there's a wallet address record for this exact address+chainId combination
            const existingWalletAddress: WalletAddress | null =
              await ctx.context.adapter.findOne({
                model: "walletAddress",
                where: [
                  { field: "address", operator: "eq", value: walletAddress },
                  { field: "chainId", operator: "eq", value: chainId },
                ],
              });

            if (existingWalletAddress) {
              // Get the user associated with this wallet address
              user = await ctx.context.adapter.findOne({
                model: "user",
                where: [
                  {
                    field: "id",
                    operator: "eq",
                    value: existingWalletAddress.userId,
                  },
                ],
              });
            } else {
              // No exact match found, check if this address exists on any other chain
              const anyWalletAddress: WalletAddress | null =
                await ctx.context.adapter.findOne({
                  model: "walletAddress",
                  where: [
                    { field: "address", operator: "eq", value: walletAddress },
                  ],
                });

              if (anyWalletAddress) {
                // Same address exists on different chain, get that user
                user = await ctx.context.adapter.findOne({
                  model: "user",
                  where: [
                    {
                      field: "id",
                      operator: "eq",
                      value: anyWalletAddress.userId,
                    },
                  ],
                });
              }
            }

            // Create new user if none exists
            if (!user) {
              const domain =
                options.emailDomainName ?? getOrigin(ctx.context.baseURL);
              // Use checksummed address for email generation
              const userEmail =
                !isAnon && email ? email : `${walletAddress}@${domain}`;

              user = await ctx.context.internalAdapter.createUser({
                name: walletAddress,
                email: userEmail,
              });

              // Create wallet address record
              await ctx.context.adapter.create<WalletAddress>({
                model: "walletAddress",
                data: {
                  userId: user.id,
                  address: walletAddress,
                  chainId,
                  isPrimary: true, // First address is primary
                  createdAt: new Date(),
                },
              });

              // Create account record for wallet authentication
              await ctx.context.internalAdapter.createAccount({
                userId: user.id,
                providerId: "siws",
                accountId: `${walletAddress}:${chainId}`,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            } else {
              // User exists, but check if this specific address/chain combo exists
              if (!existingWalletAddress) {
                // Add this new chainId to existing user's addresses
                await ctx.context.adapter.create({
                  model: "walletAddress",
                  data: {
                    userId: user.id,
                    address: walletAddress,
                    chainId,
                    isPrimary: false, // Additional addresses are not primary by default
                    createdAt: new Date(),
                  },
                });

                // Create account record for this new wallet+chain combination
                await ctx.context.internalAdapter.createAccount({
                  userId: user.id,
                  providerId: "siws",
                  accountId: `${walletAddress}:${chainId}`,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            }

            const session = await ctx.context.internalAdapter.createSession(
              user.id,
              ctx,
            );

            if (!session) {
              throw new APIError("INTERNAL_SERVER_ERROR", {
                message: "Internal Server Error",
                status: 500,
              });
            }

            await setSessionCookie(ctx, { session, user });

            return ctx.json({
              token: session.token,
              success: true,
              user: {
                id: user.id,
                walletAddress,
                chainId,
              },
            });
          } catch (error) {
            if (error instanceof APIError) throw error;
            throw new APIError("UNAUTHORIZED", {
              message: "Something went wrong. Please try again later.",
              error: error instanceof Error ? error.message : "Unknown error",
              status: 401,
            });
          }
        },
      ),
    },
  }) satisfies BetterAuthPlugin;

function getOrigin(url: string) {
  try {
    const parsedUrl = new URL(url);
    // For custom URL schemes (like exp://), the origin property returns the string "null"
    // instead of null. We need to handle this case and return null so the fallback logic works.
    return parsedUrl.origin === "null" ? null : parsedUrl.origin;
  } catch (error) {
    return null;
  }
}
