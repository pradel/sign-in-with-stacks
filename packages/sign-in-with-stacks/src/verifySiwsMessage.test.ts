import { bytesToHex } from "@stacks/common";
import { hashMessage } from "@stacks/encryption";
import { STACKS_TESTNET } from "@stacks/network";
import { signMessageHashRsv } from "@stacks/transactions";
import { expect, test } from "vitest";
import { accounts } from "../test/constants.js";
import { createSiwsMessage } from "./createSiwsMessage.js";
import { verifySiwsMessage } from "./verifySiwsMessage.js";

const account = accounts[0];

test("default", async () => {
  const message = createSiwsMessage({
    address: account.address,
    chainId: STACKS_TESTNET.chainId,
    domain: "example.com",
    nonce: "foobarbaz",
    uri: "https://example.com/path",
    version: "1",
  });

  const hash = hashMessage(message);
  const signature = signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey: account.privateKey,
  });

  expect(
    verifySiwsMessage({
      message,
      signature,
    }),
  ).toBeTruthy();
});

test("behavior: invalid message fields", async () => {
  const message = createSiwsMessage({
    address: account.address,
    chainId: STACKS_TESTNET.chainId,
    domain: "example.com",
    nonce: "foobarbaz",
    uri: "https://example.com/path",
    version: "1",
  });

  const hash = hashMessage(message);
  const signature = signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey: account.privateKey,
  });

  expect(
    verifySiwsMessage({
      domain: "viem.sh",
      message,
      signature,
    }),
  ).toBeFalsy();
});

test("behavior: invalid address not matching signature", async () => {
  const message = createSiwsMessage({
    address: "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173",
    chainId: STACKS_TESTNET.chainId,
    domain: "example.com",
    nonce: "foobarbaz",
    uri: "https://example.com/path",
    version: "1",
  });

  const hash = hashMessage(message);
  const signature = signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey: account.privateKey,
  });

  expect(
    verifySiwsMessage({
      message,
      signature,
    }),
  ).toBeFalsy();
});

test("behavior: confusable address spelling verifies against the signer", async () => {
  const canonicalMessage = createSiwsMessage({
    address: account.address,
    chainId: STACKS_TESTNET.chainId,
    domain: "example.com",
    nonce: "foobarbaz",
    uri: "https://example.com/path",
    version: "1",
  });
  const message = canonicalMessage.replace(
    account.address,
    account.address.replace(/0/g, "O"),
  );

  const hash = hashMessage(message);
  const signature = signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey: account.privateKey,
  });

  expect(
    verifySiwsMessage({
      message,
      signature,
    }),
  ).toBeTruthy();
});

test("behavior: unparseable expirationTime does not bypass expiration", async () => {
  const message = createSiwsMessage({
    address: account.address,
    chainId: STACKS_TESTNET.chainId,
    domain: "example.com",
    expirationTime: new Date(Date.UTC(2000, 0, 1)),
    nonce: "foobarbaz",
    uri: "https://example.com/path",
    version: "1",
  });
  const raw = message.replace(/Expiration Time: .*/, "Expiration Time: never");

  const hash = hashMessage(raw);
  const signature = signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey: account.privateKey,
  });

  expect(
    verifySiwsMessage({
      message: raw,
      signature,
    }),
  ).toBeFalsy();
});

test("behavior: unparseable notBefore does not bypass notBefore", async () => {
  const message = createSiwsMessage({
    address: account.address,
    chainId: STACKS_TESTNET.chainId,
    domain: "example.com",
    notBefore: new Date(Date.UTC(2099, 0, 1)),
    nonce: "foobarbaz",
    uri: "https://example.com/path",
    version: "1",
  });
  const raw = message.replace(/Not Before: .*/, "Not Before: never");

  const hash = hashMessage(raw);
  const signature = signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey: account.privateKey,
  });

  expect(
    verifySiwsMessage({
      message: raw,
      signature,
    }),
  ).toBeFalsy();
});

test("behavior: invalid message", async () => {
  const message = "foobarbaz";
  const hash = hashMessage(message);
  const signature = signMessageHashRsv({
    messageHash: bytesToHex(hash),
    privateKey: account.privateKey,
  });
  expect(
    verifySiwsMessage({
      message,
      signature,
    }),
  ).toBeFalsy();
});
