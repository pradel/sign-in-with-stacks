import { createPlaceholderEmail } from "@better-auth/core/utils/email";
import type { BetterAuthPlugin, InferOptionSchema, User } from "better-auth";
import { APIError, createAuthEndpoint, isAPIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { mergeSchema } from "better-auth/db";
import * as z from "zod";
import { generateSiwsNonce, verifySiwsMessage } from "../../index.js";
import { parseSiwsMessage } from "../../parseSiwsMessage.js";
import { getAddress, isAddress } from "../../utils.js";
import { PACKAGE_VERSION } from "../../version.js";
import { schema, type WalletAddressSchema } from "./schema.js";
import type {
  ResolveProfileArgs,
  ResolveProfileResult,
  SIWSVerifyMessageArgs,
  WalletAddress,
} from "./types.js";

declare module "@better-auth/core" {
  interface BetterAuthPluginRegistry<AuthOptions, Options> {
    siws: {
      creator: typeof siws;
    };
  }
}

export interface SIWSPluginOptions {
  // The domain name of your application (required for SIWS message generation)
  domain: string;
  // The email domain name for creating user accounts when not using anonymous mode. Defaults to a placeholder domain
  emailDomainName?: string | undefined;
  // Whether to allow anonymous sign-ins without requiring an email. Default is true
  anonymous?: boolean | undefined;
  // Function to generate a unique nonce for each sign-in attempt. You must implement this function to return a cryptographically secure random string. Must return a Promise<string>
  getNonce?: () => Promise<string>;
  // Function to verify the SIWS message signature. Defaults to the built-in Stacks verifier
  verifyMessage?:
    ((args: SIWSVerifyMessageArgs) => Promise<boolean>) | undefined;
  // Function to resolve a display name and avatar for a new wallet user
  resolveProfile?:
    ((args: ResolveProfileArgs) => Promise<ResolveProfileResult>) | undefined;
  // Custom schema for the plugin's walletAddress table
  schema?: InferOptionSchema<typeof schema> | undefined;
}

const SIWS_VERIFICATION_IDENTIFIER_PREFIX = "siws:";
// MySQL adapter schemas cap verification.identifier at 255 characters.
const VERIFICATION_IDENTIFIER_MAX_LENGTH = 255;
const SIWS_NONCE_MAX_LENGTH =
  VERIFICATION_IDENTIFIER_MAX_LENGTH -
  SIWS_VERIFICATION_IDENTIFIER_PREFIX.length;
const SIWS_NONCE_ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
const SIWS_MAX_CHAIN_ID = 4294967295;

const isValidSiwsNonce = (nonce: string | undefined): nonce is string =>
  typeof nonce === "string" &&
  nonce.length >= 8 &&
  nonce.length <= SIWS_NONCE_MAX_LENGTH &&
  SIWS_NONCE_ALPHANUMERIC_REGEX.test(nonce);

const siwsMessageMismatchError = () =>
  new APIError("UNAUTHORIZED", {
    message:
      "Unauthorized: SIWS message does not match the expected domain, address, chain ID, or nonce",
    status: 401,
    code: "UNAUTHORIZED_SIWS_MESSAGE_MISMATCH",
  });

export const siws = (options: SIWSPluginOptions) => {
  const verifyMessage =
    options.verifyMessage ??
    (async (args: SIWSVerifyMessageArgs) => {
      const { nonce } = parseSiwsMessage(args.message);
      return verifySiwsMessage({
        message: args.message,
        signature: args.signature,
        address: args.address,
        domain: options.domain,
        nonce,
      });
    });

  return {
    id: "siws",
    version: PACKAGE_VERSION,
    schema: mergeSchema(schema, options?.schema) as WalletAddressSchema,
    endpoints: {
      nonce: createAuthEndpoint(
        "/siws/nonce",
        {
          method: "POST",
          body: z.object({}).strict().optional(),
        },
        async (ctx) => {
          const nonce = options.getNonce
            ? await options.getNonce()
            : generateSiwsNonce();

          if (!isValidSiwsNonce(nonce)) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: `SIWS getNonce must return a nonce of 8-${SIWS_NONCE_MAX_LENGTH} alphanumeric characters.`,
              status: 500,
              code: "SIWS_INVALID_NONCE",
            });
          }

          // Store nonce with 15-minute expiration
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `${SIWS_VERIFICATION_IDENTIFIER_PREFIX}${nonce}`,
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
              message: z.string().min(1),
              signature: z.string().min(1),
              email: z.email().optional(),
            })
            .strict()
            .refine((data) => options.anonymous !== false || !!data.email, {
              message:
                "Email is required when the anonymous plugin option is disabled.",
              path: ["email"],
            }),
          requireRequest: true,
        },
        async (ctx) => {
          const { message, signature, email } = ctx.body;
          const isAnon = options.anonymous ?? true;

          if (!isAnon && !email) {
            throw new APIError("BAD_REQUEST", {
              message: "Email is required when anonymous is disabled.",
              status: 400,
            });
          }

          try {
            // The signed message is the source of truth for wallet identity:
            // address, chain ID, nonce, and time bounds are read from it rather
            // than from the request body.
            const parsedMessage = parseSiwsMessage(message);
            const { address, chainId, nonce } = parsedMessage;

            if (
              !address ||
              !isAddress(address) ||
              !isValidSiwsNonce(nonce) ||
              typeof chainId !== "number" ||
              !Number.isInteger(chainId) ||
              chainId < 1 ||
              chainId > SIWS_MAX_CHAIN_ID ||
              parsedMessage.domain !== options.domain
            ) {
              throw siwsMessageMismatchError();
            }

            // Canonicalize the signed address before using it as an identity:
            // c32check decoding folds case and the confusable characters
            // `O`/`0` and `I`/`L`/`1`, so equivalent spellings must resolve to
            // a single wallet record instead of creating duplicate users.
            const walletAddress = getAddress(address);

            const now = new Date();
            if (parsedMessage.expirationTime) {
              if (
                Number.isNaN(parsedMessage.expirationTime.getTime()) ||
                now >= parsedMessage.expirationTime
              ) {
                throw new APIError("UNAUTHORIZED", {
                  message: "Unauthorized: SIWS message has expired",
                  status: 401,
                  code: "UNAUTHORIZED_SIWS_MESSAGE_EXPIRED",
                });
              }
            }
            if (parsedMessage.notBefore) {
              if (
                Number.isNaN(parsedMessage.notBefore.getTime()) ||
                now < parsedMessage.notBefore
              ) {
                throw new APIError("UNAUTHORIZED", {
                  message: "Unauthorized: SIWS message is not yet valid",
                  status: 401,
                  code: "UNAUTHORIZED_SIWS_MESSAGE_NOT_YET_VALID",
                });
              }
            }

            // Atomically consume the single-use nonce before any signature
            // work. The first concurrent request wins; every racer gets null.
            // Expired nonces are treated as already consumed.
            const verification =
              await ctx.context.internalAdapter.consumeVerificationValue(
                `${SIWS_VERIFICATION_IDENTIFIER_PREFIX}${nonce}`,
              );

            if (!verification) {
              throw new APIError("UNAUTHORIZED", {
                message: "Unauthorized: Invalid or expired nonce",
                status: 401,
                code: "UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE",
              });
            }

            // Verify SIWS message with enhanced parameters
            const verified = await verifyMessage({
              message,
              signature,
              address: walletAddress,
              chainId,
            });

            if (!verified) {
              throw new APIError("UNAUTHORIZED", {
                message: "Unauthorized: Invalid SIWS signature",
                status: 401,
              });
            }

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
              const normalizedEmail = email?.toLowerCase();
              const walletEmail = options.emailDomainName
                ? `${walletAddress}@${options.emailDomainName}`
                : createPlaceholderEmail({
                    identifier: walletAddress,
                    namespace: "siws",
                  });
              // SIWS proves wallet control, not email ownership: bind the caller
              // email only when unclaimed and atomically reserved, else keep
              // the wallet-derived address. Silent fallback avoids an
              // enumeration oracle.
              let userEmail = walletEmail;
              let emailClaimIdentifier: string | undefined;
              if (!isAnon && normalizedEmail) {
                const identifier = `siws-email-claim-${normalizedEmail}`;
                let reserved = false;
                try {
                  reserved =
                    await ctx.context.internalAdapter.reserveVerificationValue({
                      identifier,
                      value: walletAddress,
                      expiresAt: new Date(Date.now() + 60_000),
                    });
                } catch {
                  reserved = false;
                }
                if (reserved) {
                  emailClaimIdentifier = identifier;
                  const existingUser =
                    await ctx.context.internalAdapter.findUserByEmail(
                      normalizedEmail,
                    );
                  if (!existingUser) {
                    userEmail = normalizedEmail;
                  }
                }
              }
              const { name, avatar } =
                (await options.resolveProfile?.({ walletAddress })) ?? {};

              const createSIWSUser = (newUserEmail: string) =>
                ctx.context.internalAdapter.createUser(
                  {
                    name: name ?? walletAddress,
                    email: newUserEmail,
                    image: avatar ?? "",
                  },
                  { method: "siws" },
                );

              try {
                user = await createSIWSUser(userEmail);
              } catch (error) {
                if (userEmail !== normalizedEmail || !normalizedEmail) {
                  throw error;
                }
                const claimedUser =
                  await ctx.context.internalAdapter.findUserByEmail(
                    normalizedEmail,
                  );
                if (!claimedUser) {
                  throw error;
                }
                userEmail = walletEmail;
                user = await createSIWSUser(userEmail);
              } finally {
                if (emailClaimIdentifier) {
                  await ctx.context.internalAdapter
                    .consumeVerificationValue(emailClaimIdentifier)
                    .catch(() => {});
                }
              }

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
            if (isAPIError(error)) throw error;
            throw new APIError("UNAUTHORIZED", {
              message: "Something went wrong. Please try again later.",
              error: error instanceof Error ? error.message : "Unknown error",
              status: 401,
            });
          }
        },
      ),
    },
    options,
  } satisfies BetterAuthPlugin;
};
