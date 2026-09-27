import { DatabaseSync } from "node:sqlite";
import { bytesToHex } from "@stacks/common";
import { hashMessage } from "@stacks/encryption";
import { STACKS_TESTNET } from "@stacks/network";
import { signMessageHashRsv } from "@stacks/transactions";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { describe, expect, test } from "vitest";
import { accounts } from "../../../test/constants.js";
import { createSiwsMessage } from "../../createSiwsMessage.js";
import { siws } from "./plugin.js";
import type { SIWSVerifyMessageArgs } from "./types.js";

const [account, otherAccount] = accounts;

type TestAuth = Awaited<ReturnType<typeof createTestInstance>>;

async function createTestInstance(
  pluginOptions?: Parameters<typeof siws>[0],
  authOptions?: Partial<Omit<Parameters<typeof betterAuth>[0], "database">>,
) {
  const database = new DatabaseSync(":memory:");

  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    database,
    emailAndPassword: { enabled: false },
    rateLimit: { enabled: false },
    secret: "better-auth-secret-that-is-long-enough-for-validation-test",
    ...authOptions,
    plugins: [
      siws(
        pluginOptions ?? {
          domain: "localhost:3000",
        },
      ),
    ],
  });

  const { runMigrations } = await getMigrations({
    ...auth.options,
    database,
  });
  await runMigrations();

  return auth;
}

async function getNonceFromApi(auth: TestAuth) {
  const res = await auth.api.nonce();
  return res.nonce as string;
}

function signMessage(message: string, privateKey: string) {
  const hash = hashMessage(message);
  return signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey,
  });
}

function createMessage(options: {
  nonce: string;
  address?: string;
  chainId?: number;
  domain?: string;
  expirationTime?: Date;
  notBefore?: Date;
}) {
  return createSiwsMessage({
    address: options.address ?? account.address,
    chainId: options.chainId ?? STACKS_TESTNET.chainId,
    domain: options.domain ?? "localhost:3000",
    nonce: options.nonce,
    uri: "http://localhost:3000",
    version: "1",
    ...(options.expirationTime
      ? { expirationTime: options.expirationTime }
      : {}),
    ...(options.notBefore ? { notBefore: options.notBefore } : {}),
  });
}

async function postJson(
  auth: TestAuth,
  path: string,
  body: Record<string, unknown>,
) {
  return auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function verifyWithApi(
  auth: TestAuth,
  body: { message: string; signature: string; email?: string },
) {
  const res = await postJson(auth, "/siws/verify", body);
  const json = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(json.message ?? "Verification failed"), {
      status: res.status,
      code: json.code,
      body: json,
    });
  }
  return json as {
    token: string;
    success: boolean;
    user: { id: string; walletAddress: string; chainId: number };
  };
}

async function signIn(
  auth: TestAuth,
  options?: {
    address?: string;
    privateKey?: string;
    chainId?: number;
    domain?: string;
    email?: string;
  },
) {
  const nonce = await getNonceFromApi(auth);
  const message = createMessage({
    nonce,
    ...(options?.address !== undefined ? { address: options.address } : {}),
    ...(options?.chainId !== undefined ? { chainId: options.chainId } : {}),
    ...(options?.domain !== undefined ? { domain: options.domain } : {}),
  });
  const signature = signMessage(
    message,
    options?.privateKey ?? account.privateKey,
  );
  return verifyWithApi(auth, {
    message,
    signature,
    ...(options?.email !== undefined ? { email: options.email } : {}),
  });
}

describe("siws plugin", () => {
  test("plugin has correct id", () => {
    const plugin = siws({ domain: "example.com" });
    expect(plugin.id).toBe("siws");
  });

  test("plugin has schema", () => {
    const plugin = siws({ domain: "example.com" });
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema.walletAddress).toBeDefined();
    expect(plugin.schema.walletAddress.fields.userId.index).toBe(true);
  });

  test("plugin has nonce and verify endpoints", () => {
    const plugin = siws({ domain: "example.com" });
    expect(plugin.endpoints.nonce).toBeDefined();
    expect(plugin.endpoints.verify).toBeDefined();
  });
});

describe("nonce endpoint", () => {
  test("returns a nonce without wallet inputs", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    expect(nonce).toMatch(/^[a-zA-Z0-9]{8,}$/);
  });

  test("allows an empty body when generating a nonce", async () => {
    const auth = await createTestInstance();
    const res = await postJson(auth, "/siws/nonce", {});
    expect(res.status).toBe(200);

    const json = (await res.json()) as { nonce: string };
    expect(json.nonce).toMatch(/^[a-zA-Z0-9]{8,}$/);
  });

  test("uses custom getNonce when provided", async () => {
    const customNonce = "customnoncevalue";
    const auth = await createTestInstance({
      domain: "localhost:3000",
      getNonce: async () => customNonce,
    });
    const nonce = await getNonceFromApi(auth);
    expect(nonce).toBe(customNonce);
  });

  test("rejects obsolete wallet-bound inputs", async () => {
    const auth = await createTestInstance();
    const res = await postJson(auth, "/siws/nonce", {
      walletAddress: account.address,
      chainId: 1,
    });
    expect(res.status).toBe(400);
  });

  test("rejects a nonce that does not follow the expected format", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      getNonce: async () => "not-a-valid-nonce!",
    });
    await expect(getNonceFromApi(auth)).rejects.toThrow(/getNonce/);
  });
});

describe("verify endpoint", () => {
  test("successfully authenticates a new user", async () => {
    const auth = await createTestInstance();
    const res = await signIn(auth);

    expect(res.success).toBe(true);
    expect(res.token).toBeTypeOf("string");
    expect(res.user.walletAddress).toBe(account.address);
    expect(res.user.chainId).toBe(STACKS_TESTNET.chainId);
  });

  test("sets a session cookie usable for authenticated requests", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce });
    const signature = signMessage(message, account.privateKey);

    const res = await postJson(auth, "/siws/verify", { message, signature });
    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0];
    expect(cookie).toBeTruthy();

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookie as string }),
    });
    expect(session?.user.id).toBeTypeOf("string");
  });

  test("creates an account record for the wallet", async () => {
    const auth = await createTestInstance();
    const res = await signIn(auth);

    const ctx = await auth.$context;
    const userAccounts = await ctx.internalAdapter.findAccounts(res.user.id);
    expect(userAccounts).toContainEqual(
      expect.objectContaining({
        providerId: "siws",
        accountId: `${account.address}:${STACKS_TESTNET.chainId}`,
      }),
    );
  });

  test("returns the same user on second sign-in", async () => {
    const auth = await createTestInstance();
    const first = await signIn(auth);
    const second = await signIn(auth);

    expect(first.user.id).toBe(second.user.id);

    const ctx = await auth.$context;
    const users = await ctx.adapter.findMany({ model: "user" });
    expect(users).toHaveLength(1);
    const wallets = await ctx.adapter.findMany({
      model: "walletAddress",
      where: [
        { field: "address", operator: "eq", value: account.address },
        { field: "chainId", operator: "eq", value: STACKS_TESTNET.chainId },
      ],
    });
    expect(wallets).toHaveLength(1);
  });

  test.each([
    ["O", (address: string) => address.replace(/0/g, "O")],
    ["I", (address: string) => address.replace(/1/g, "I")],
    ["L", (address: string) => address.replace(/1/g, "L")],
  ])(
    "stores and returns the canonical address for a %s spelling",
    async (_name, toVariant) => {
      const auth = await createTestInstance();
      const variant = toVariant(account.address);
      expect(variant).not.toBe(account.address);

      const first = await signIn(auth, { address: variant });
      expect(first.user.walletAddress).toBe(account.address);

      const second = await signIn(auth);
      expect(second.user.id).toBe(first.user.id);

      const ctx = await auth.$context;
      const wallets = await ctx.adapter.findMany({
        model: "walletAddress",
        where: [{ field: "address", operator: "eq", value: account.address }],
      });
      expect(wallets).toHaveLength(1);
    },
  );

  test("uses the chain id from the signed message", async () => {
    const auth = await createTestInstance();
    const chainId = 2;
    const res = await signIn(auth, { chainId });

    expect(res.user.chainId).toBe(chainId);

    const ctx = await auth.$context;
    const wallet = await ctx.adapter.findOne<{ chainId: number }>({
      model: "walletAddress",
      where: [
        { field: "address", operator: "eq", value: account.address },
        { field: "chainId", operator: "eq", value: chainId },
      ],
    });
    expect(wallet?.chainId).toBe(chainId);
  });

  test("links same address across different chains to same user", async () => {
    const auth = await createTestInstance();
    const first = await signIn(auth);
    const second = await signIn(auth, { chainId: 2 });

    expect(first.user.id).toBe(second.user.id);
  });

  test("rejects invalid signature", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce });
    const signature = signMessage("wrong message", account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
  });

  test("supports a custom verifyMessage", async () => {
    const calls: SIWSVerifyMessageArgs[] = [];
    const auth = await createTestInstance({
      domain: "localhost:3000",
      verifyMessage: async (args) => {
        calls.push(args);
        return true;
      },
    });

    const res = await signIn(auth);
    expect(res.success).toBe(true);

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.address).toBe(account.address);
    expect(call?.chainId).toBe(STACKS_TESTNET.chainId);
    expect(call?.message).toBeTypeOf("string");
    expect(call?.signature).toBeTypeOf("string");
  });

  test("rejects a signature when a custom verifyMessage returns false", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      verifyMessage: async () => false,
    });

    const error = await signIn(auth).catch((e) => e);
    expect(error.status).toBe(401);
  });

  test("rejects a message with an unknown nonce", async () => {
    const auth = await createTestInstance();
    const message = createMessage({ nonce: "UnknownNonce12345678" });
    const signature = signMessage(message, account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE");
  });

  test.each([
    { name: "short", nonce: "abc1234" },
    { name: "non-alphanumeric", nonce: "some-other-nonce" },
    { name: "oversized", nonce: "A".repeat(251) },
  ])(
    "rejects a signed message with a $name nonce before nonce lookup",
    async ({ nonce }) => {
      const auth = await createTestInstance();
      const ctx = await auth.$context;
      const consumeVerificationValue =
        ctx.internalAdapter.consumeVerificationValue;
      let consumed = false;
      ctx.internalAdapter.consumeVerificationValue = async (identifier) => {
        consumed = true;
        return consumeVerificationValue(identifier);
      };

      try {
        const message = createMessage({
          nonce: "ValidNonce12345678",
        }).replace("Nonce: ValidNonce12345678", `Nonce: ${nonce}`);
        const signature = signMessage(message, account.privateKey);

        const error = await verifyWithApi(auth, { message, signature }).catch(
          (e) => e,
        );
        expect(error.status).toBe(401);
        expect(error.code).toBe("UNAUTHORIZED_SIWS_MESSAGE_MISMATCH");
        expect(consumed).toBe(false);
      } finally {
        ctx.internalAdapter.consumeVerificationValue = consumeVerificationValue;
      }
    },
  );

  test("rejects a signed message with an invalid address", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce }).replace(
      account.address,
      "invalid",
    );
    const signature = signMessage(message, account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_SIWS_MESSAGE_MISMATCH");
  });

  test("rejects obsolete wallet-bound verify inputs", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce });
    const signature = signMessage(message, account.privateKey);

    const res = await postJson(auth, "/siws/verify", {
      message,
      signature,
      walletAddress: account.address,
      chainId: STACKS_TESTNET.chainId,
    });
    expect(res.status).toBe(400);
  });

  test("prevents nonce reuse", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce });
    const signature = signMessage(message, account.privateKey);

    await verifyWithApi(auth, { message, signature });

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE");
  });

  test("mints exactly one session when the same nonce is verified concurrently", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce });
    const signature = signMessage(message, account.privateKey);

    const ctx = await auth.$context;
    const sessionsBefore = await ctx.adapter.findMany({ model: "session" });

    const results = await Promise.allSettled([
      verifyWithApi(auth, { message, signature }),
      verifyWithApi(auth, { message, signature }),
    ]);

    const successes = results.filter((result) => result.status === "fulfilled");
    expect(successes).toHaveLength(1);

    const sessionsAfter = await ctx.adapter.findMany({ model: "session" });
    expect(sessionsAfter.length).toBe(sessionsBefore.length + 1);

    const wallets = await ctx.adapter.findMany({
      model: "walletAddress",
      where: [{ field: "address", operator: "eq", value: account.address }],
    });
    expect(wallets).toHaveLength(1);
  });

  test("rejects an expired nonce and consumes the row", async () => {
    const auth = await createTestInstance();
    const ctx = await auth.$context;
    const nonce = "ExpiredNonce12345678";
    const identifier = `siws:${nonce}`;

    await ctx.internalAdapter.createVerificationValue({
      identifier,
      value: nonce,
      expiresAt: new Date(Date.now() - 1000),
    });

    const message = createMessage({ nonce });
    const signature = signMessage(message, account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE");
    expect(
      await ctx.internalAdapter.findVerificationValue(identifier),
    ).toBeNull();
  });

  test("rejects a message bound to a different domain", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce, domain: "other.example.com" });
    const signature = signMessage(message, account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_SIWS_MESSAGE_MISMATCH");
  });

  test("rejects a message with an invalid chain id", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce }).replace(
      `Chain ID: ${STACKS_TESTNET.chainId}`,
      "Chain ID: 0",
    );
    const signature = signMessage(message, account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_SIWS_MESSAGE_MISMATCH");
  });

  test("rejects an arbitrary message even with a valid signature", async () => {
    const auth = await createTestInstance();
    const message = "gm, please sign this to continue";
    const signature = signMessage(message, account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_SIWS_MESSAGE_MISMATCH");
  });

  test("rejects an expired message", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({
      nonce,
      expirationTime: new Date(Date.now() - 60_000),
    });
    const signature = signMessage(message, account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_SIWS_MESSAGE_EXPIRED");
  });

  test("rejects a message that is not yet valid", async () => {
    const auth = await createTestInstance();
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({
      nonce,
      notBefore: new Date(Date.now() + 60_000),
    });
    const signature = signMessage(message, account.privateKey);

    const error = await verifyWithApi(auth, { message, signature }).catch(
      (e) => e,
    );
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED_SIWS_MESSAGE_NOT_YET_VALID");
  });

  test("does not mint a session when an unrelated signature is reused", async () => {
    const auth = await createTestInstance();
    await signIn(auth);

    const ctx = await auth.$context;
    const sessionsBefore = await ctx.adapter.findMany({ model: "session" });

    const nonce = await getNonceFromApi(auth);
    expect(nonce).toBeTypeOf("string");
    const unrelated = "Approve the transfer of 1 STX";
    const signature = signMessage(unrelated, account.privateKey);

    const error = await verifyWithApi(auth, {
      message: unrelated,
      signature,
    }).catch((e) => e);
    expect(error.status).toBe(401);

    const sessionsAfter = await ctx.adapter.findMany({ model: "session" });
    expect(sessionsAfter.length).toBe(sessionsBefore.length);
  });
});

describe("email handling", () => {
  test("uses a placeholder email in anonymous mode", async () => {
    const auth = await createTestInstance();
    const res = await signIn(auth);

    const ctx = await auth.$context;
    const user = await ctx.adapter.findOne<{ email: string }>({
      model: "user",
      where: [{ field: "id", operator: "eq", value: res.user.id }],
    });
    expect(user?.email).toBe(
      `${account.address.toLowerCase()}@siws.placeholder.invalid`,
    );
  });

  test("uses custom emailDomainName", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      emailDomainName: "myapp.com",
    });
    const res = await signIn(auth);

    const ctx = await auth.$context;
    const user = await ctx.adapter.findOne<{ email: string }>({
      model: "user",
      where: [{ field: "id", operator: "eq", value: res.user.id }],
    });
    expect(user?.email).toBe(`${account.address.toLowerCase()}@myapp.com`);
  });

  test("requires an email when anonymous is disabled", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      anonymous: false,
    });
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce });
    const signature = signMessage(message, account.privateKey);

    const res = await postJson(auth, "/siws/verify", { message, signature });
    expect(res.status).toBe(400);
  });

  test("rejects an invalid email format when anonymous is disabled", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      anonymous: false,
    });
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce });
    const signature = signMessage(message, account.privateKey);

    const res = await postJson(auth, "/siws/verify", {
      message,
      signature,
      email: "not-an-email",
    });
    expect(res.status).toBe(400);
  });

  test("rejects an empty email when anonymous is disabled", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      anonymous: false,
    });
    const nonce = await getNonceFromApi(auth);
    const message = createMessage({ nonce });
    const signature = signMessage(message, account.privateKey);

    const res = await postJson(auth, "/siws/verify", {
      message,
      signature,
      email: "",
    });
    expect(res.status).toBe(400);
  });

  test("binds a caller-supplied email when unclaimed", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      anonymous: false,
    });
    const res = await signIn(auth, { email: "stacks@example.com" });

    const ctx = await auth.$context;
    const user = await ctx.adapter.findOne<{ email: string }>({
      model: "user",
      where: [{ field: "id", operator: "eq", value: res.user.id }],
    });
    expect(user?.email).toBe("stacks@example.com");
  });

  test.each([
    new Error(
      "reserveVerificationValue requires database-backed verification storage. Set verification.storeInDatabase to true for flows that reserve verification values.",
    ),
    new Error("reservation adapter unavailable"),
  ])(
    "keeps the wallet email fallback when email reservation fails with %s",
    async (reservationError) => {
      const auth = await createTestInstance({
        domain: "localhost:3000",
        anonymous: false,
      });
      const ctx = await auth.$context;
      const reserveVerificationValue =
        ctx.internalAdapter.reserveVerificationValue;
      ctx.internalAdapter.reserveVerificationValue = async () => {
        throw reservationError;
      };

      try {
        const res = await signIn(auth, { email: "user@example.com" });

        const user = await ctx.adapter.findOne<{ email: string }>({
          model: "user",
          where: [{ field: "id", operator: "eq", value: res.user.id }],
        });
        expect(user?.email).toBe(
          `${account.address.toLowerCase()}@siws.placeholder.invalid`,
        );
      } finally {
        ctx.internalAdapter.reserveVerificationValue = reserveVerificationValue;
      }
    },
  );

  test("does not bind an email that already belongs to another account", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      anonymous: false,
    });
    const ctx = await auth.$context;
    await ctx.internalAdapter.createUser(
      { name: "Existing", email: "taken@example.com" },
      { method: "email-password" },
    );

    const res = await signIn(auth, { email: "taken@example.com" });

    const user = await ctx.adapter.findOne<{ email: string }>({
      model: "user",
      where: [{ field: "id", operator: "eq", value: res.user.id }],
    });
    expect(user?.email).toBe(
      `${account.address.toLowerCase()}@siws.placeholder.invalid`,
    );

    const usersWithEmail = await ctx.adapter.findMany({
      model: "user",
      where: [{ field: "email", operator: "eq", value: "taken@example.com" }],
    });
    expect(usersWithEmail).toHaveLength(1);
  });

  test("treats a case-variant of an existing email as the same email", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      anonymous: false,
    });
    const first = await signIn(auth, { email: "Mixed@Case.com" });

    const ctx = await auth.$context;
    const firstUser = await ctx.adapter.findOne<{ email: string }>({
      model: "user",
      where: [{ field: "id", operator: "eq", value: first.user.id }],
    });
    expect(firstUser?.email).toBe("mixed@case.com");

    const second = await signIn(auth, {
      address: otherAccount.address,
      privateKey: otherAccount.privateKey,
      email: "mixed@case.com",
    });

    const secondUser = await ctx.adapter.findOne<{ email: string }>({
      model: "user",
      where: [{ field: "id", operator: "eq", value: second.user.id }],
    });
    expect(secondUser?.email).toBe(
      `${otherAccount.address.toLowerCase()}@siws.placeholder.invalid`,
    );
  });

  test("rejects a new wallet user when validateUserInfo returns an error", async () => {
    const auth = await createTestInstance(
      { domain: "localhost:3000", anonymous: false },
      {
        user: {
          validateUserInfo({ source }) {
            expect(source.method).toBe("siws");
            return {
              error: "siws_blocked",
              errorDescription: "SIWS sign-up is not allowed",
            };
          },
        },
      },
    );

    const error = await signIn(auth, { email: "siws@example.com" }).catch(
      (e) => e,
    );
    expect(error.code).toBe("siws_blocked");
    expect(error.message).toBe("SIWS sign-up is not allowed");
  });
});

describe("plugin options", () => {
  test("exposes the plugin options", () => {
    const options = { domain: "example.com" };
    const plugin = siws(options);
    expect(plugin.options).toBe(options);
  });

  test("uses resolveProfile for the user name and image", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
      resolveProfile: async ({ walletAddress }) => ({
        name: `bns:${walletAddress}`,
        avatar: "https://example.com/avatar.png",
      }),
    });
    const res = await signIn(auth);

    const ctx = await auth.$context;
    const user = await ctx.adapter.findOne<{ name: string; image: string }>({
      model: "user",
      where: [{ field: "id", operator: "eq", value: res.user.id }],
    });
    expect(user?.name).toBe(`bns:${account.address}`);
    expect(user?.image).toBe("https://example.com/avatar.png");
  });

  test("supports a custom schema", async () => {
    const auth = await createTestInstance({
      domain: "localhost:3000",
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
    const res = await signIn(auth);
    expect(res.success).toBe(true);

    const ctx = await auth.$context;
    const wallets = await ctx.adapter.findMany({
      model: "walletAddress",
      where: [
        { field: "address", operator: "eq", value: account.address },
        { field: "chainId", operator: "eq", value: STACKS_TESTNET.chainId },
      ],
    });
    expect(wallets).toHaveLength(1);
    expect(wallets[0]).toMatchObject({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      isPrimary: true,
    });
  });
});
