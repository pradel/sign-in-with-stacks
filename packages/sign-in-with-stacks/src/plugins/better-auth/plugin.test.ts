import { bytesToHex } from "@stacks/common";
import { hashMessage } from "@stacks/encryption";
import { STACKS_MAINNET, STACKS_TESTNET } from "@stacks/network";
import { signMessageHashRsv } from "@stacks/transactions";
import { getTestInstance } from "better-auth/test";
import { describe, expect, test } from "vitest";
import { accounts } from "../../../test/constants.js";
import { createSiwsMessage } from "../../createSiwsMessage.js";
import { siws } from "./plugin.js";

const account = accounts[0];

function createTestInstance(pluginOptions?: Parameters<typeof siws>[0]) {
  return getTestInstance(
    {
      plugins: [
        siws(
          pluginOptions ?? {
            domain: "localhost:3000",
          },
        ),
      ],
    },
    {
      disableTestUser: true,
    },
  );
}

async function getNonceFromApi(
  auth: Awaited<ReturnType<typeof createTestInstance>>["auth"],
  walletAddress: string,
  chainId?: number,
) {
  const res = await auth.api.nonce({
    body: { walletAddress, ...(chainId !== undefined ? { chainId } : {}) },
  });
  return res.nonce as string;
}

function signMessage(message: string, privateKey: string) {
  const hash = hashMessage(message);
  return signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey,
  });
}

async function verifyWithApi(
  auth: Awaited<ReturnType<typeof createTestInstance>>["auth"],
  body: {
    walletAddress: string;
    message: string;
    signature: string;
    chainId?: number;
    email?: string;
  },
) {
  return auth.api.verify({
    body,
    request: new Request("http://localhost:3000/api/auth/siws/verify", {
      method: "POST",
    }),
    headers: new Headers(),
  });
}

describe("siws plugin", () => {
  test("plugin has correct id", () => {
    const plugin = siws({ domain: "example.com" });
    expect(plugin.id).toBe("sign-in-with-stacks");
  });

  test("plugin has schema", () => {
    const plugin = siws({ domain: "example.com" });
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema.walletAddress).toBeDefined();
  });

  test("plugin has nonce and verify endpoints", () => {
    const plugin = siws({ domain: "example.com" });
    expect(plugin.endpoints.nonce).toBeDefined();
    expect(plugin.endpoints.verify).toBeDefined();
  });
});

describe("nonce endpoint", () => {
  test("returns a nonce for a valid wallet address", async () => {
    const { auth } = await createTestInstance();
    const nonce = await getNonceFromApi(auth, account.address);
    expect(nonce).toBeTypeOf("string");
    expect(nonce.length).toBeGreaterThanOrEqual(8);
  });

  test("uses custom getNonce when provided", async () => {
    const customNonce = "customnoncevalue";
    const { auth } = await createTestInstance({
      domain: "localhost:3000",
      getNonce: async () => customNonce,
    });
    const nonce = await getNonceFromApi(auth, account.address);
    expect(nonce).toBe(customNonce);
  });

  test("defaults chainId to mainnet", async () => {
    const { auth } = await createTestInstance();
    // Verify we get a nonce back when not specifying chainId
    const nonce = await getNonceFromApi(auth, account.address);
    expect(nonce).toBeTypeOf("string");
  });

  test("accepts testnet chain id", async () => {
    const { auth } = await createTestInstance();
    const nonce = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );
    expect(nonce).toBeTypeOf("string");
  });
});

describe("verify endpoint", () => {
  test("successfully authenticates a new user", async () => {
    const { auth } = await createTestInstance();
    const nonce = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );

    const message = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce,
      uri: "http://localhost:3000",
      version: "1",
    });

    const signature = signMessage(message, account.privateKey);

    const res = await verifyWithApi(auth, {
      walletAddress: account.address,
      message,
      signature,
      chainId: STACKS_TESTNET.chainId,
    });

    expect(res.success).toBe(true);
    expect(res.token).toBeTypeOf("string");
    expect(res.user.walletAddress).toBe(account.address);
    expect(res.user.chainId).toBe(STACKS_TESTNET.chainId);
  });

  test("returns the same user on second sign-in", async () => {
    const { auth } = await createTestInstance();

    // First sign-in
    const nonce1 = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );
    const message1 = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce: nonce1,
      uri: "http://localhost:3000",
      version: "1",
    });
    const signature1 = signMessage(message1, account.privateKey);
    const res1 = await verifyWithApi(auth, {
      walletAddress: account.address,
      message: message1,
      signature: signature1,
      chainId: STACKS_TESTNET.chainId,
    });

    // Second sign-in
    const nonce2 = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );
    const message2 = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce: nonce2,
      uri: "http://localhost:3000",
      version: "1",
    });
    const signature2 = signMessage(message2, account.privateKey);
    const res2 = await verifyWithApi(auth, {
      walletAddress: account.address,
      message: message2,
      signature: signature2,
      chainId: STACKS_TESTNET.chainId,
    });

    expect(res1.user.id).toBe(res2.user.id);
  });

  test("rejects invalid signature", async () => {
    const { auth } = await createTestInstance();
    const nonce = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );

    const message = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce,
      uri: "http://localhost:3000",
      version: "1",
    });

    // Sign a different message to produce an invalid signature
    const invalidSignature = signMessage("wrong message", account.privateKey);

    await expect(
      verifyWithApi(auth, {
        walletAddress: account.address,
        message,
        signature: invalidSignature,
        chainId: STACKS_TESTNET.chainId,
      }),
    ).rejects.toThrow();
  });

  test("rejects invalid nonce", async () => {
    const { auth } = await createTestInstance();

    // Create a message with a nonce that was never stored
    const message = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce: "noncethatwasneverstored",
      uri: "http://localhost:3000",
      version: "1",
    });

    const signature = signMessage(message, account.privateKey);

    await expect(
      verifyWithApi(auth, {
        walletAddress: account.address,
        message,
        signature,
        chainId: STACKS_TESTNET.chainId,
      }),
    ).rejects.toThrow();
  });

  test("prevents nonce reuse", async () => {
    const { auth } = await createTestInstance();
    const nonce = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );

    const message = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce,
      uri: "http://localhost:3000",
      version: "1",
    });

    const signature = signMessage(message, account.privateKey);

    // First verification should succeed
    await verifyWithApi(auth, {
      walletAddress: account.address,
      message,
      signature,
      chainId: STACKS_TESTNET.chainId,
    });

    // Second verification with same nonce should fail
    await expect(
      verifyWithApi(auth, {
        walletAddress: account.address,
        message,
        signature,
        chainId: STACKS_TESTNET.chainId,
      }),
    ).rejects.toThrow();
  });

  test("links same address across different chains to same user", async () => {
    const { auth } = await createTestInstance();

    // Sign in on testnet
    const nonce1 = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );
    const message1 = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce: nonce1,
      uri: "http://localhost:3000",
      version: "1",
    });
    const signature1 = signMessage(message1, account.privateKey);
    const res1 = await verifyWithApi(auth, {
      walletAddress: account.address,
      message: message1,
      signature: signature1,
      chainId: STACKS_TESTNET.chainId,
    });

    // Sign in on a different chain with same address
    const chainIdB = 2;
    const nonce2 = await getNonceFromApi(auth, account.address, chainIdB);
    const message2 = createSiwsMessage({
      address: account.address,
      chainId: chainIdB,
      domain: "localhost:3000",
      nonce: nonce2,
      uri: "http://localhost:3000",
      version: "1",
    });
    const signature2 = signMessage(message2, account.privateKey);
    const res2 = await verifyWithApi(auth, {
      walletAddress: account.address,
      message: message2,
      signature: signature2,
      chainId: chainIdB,
    });

    // Same user should be linked across chains
    expect(res1.user.id).toBe(res2.user.id);
  });

  test("generates email in anonymous mode", async () => {
    const { auth, db } = await createTestInstance();
    const nonce = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );

    const message = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce,
      uri: "http://localhost:3000",
      version: "1",
    });

    const signature = signMessage(message, account.privateKey);

    const res = await verifyWithApi(auth, {
      walletAddress: account.address,
      message,
      signature,
      chainId: STACKS_TESTNET.chainId,
    });

    // Check the user's email in the database
    const user = await db.findOne({
      model: "user",
      where: [{ field: "id", operator: "eq", value: res.user.id }],
    });
    expect(user?.email).toContain(account.address.toLowerCase());
  });

  test("uses custom emailDomainName", async () => {
    const { auth, db } = await createTestInstance({
      domain: "localhost:3000",
      emailDomainName: "myapp.com",
    });

    const nonce = await getNonceFromApi(
      auth,
      account.address,
      STACKS_TESTNET.chainId,
    );

    const message = createSiwsMessage({
      address: account.address,
      chainId: STACKS_TESTNET.chainId,
      domain: "localhost:3000",
      nonce,
      uri: "http://localhost:3000",
      version: "1",
    });

    const signature = signMessage(message, account.privateKey);

    const res = await verifyWithApi(auth, {
      walletAddress: account.address,
      message,
      signature,
      chainId: STACKS_TESTNET.chainId,
    });

    const user = await db.findOne({
      model: "user",
      where: [{ field: "id", operator: "eq", value: res.user.id }],
    });
    expect(user?.email).toBe(`${account.address.toLowerCase()}@myapp.com`);
  });
});
