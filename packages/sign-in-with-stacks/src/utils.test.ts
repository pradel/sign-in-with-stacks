import { expect, test } from "vitest";
import { accounts } from "../test/constants.js";
import { getAddress, isAddress, isAddressEqual, isUri } from "./utils.js";

const [account, otherAccount] = accounts;

test("isUri - default", () => {
  expect(isUri("https://example.com/foo")).toMatchInlineSnapshot(
    `"https://example.com/foo"`,
  );
});

test("isUri - behavior: check for illegal characters", () => {
  expect(isUri("^")).toBeFalsy();
});

test("isUri - incomplete hex escapes", () => {
  expect(isUri("%$#")).toBeFalsy();
  expect(isUri("%0:#")).toBeFalsy();
});

test("isUri - missing scheme", () => {
  expect(isUri("example.com/foo")).toBeFalsy();
});

test("isUri - authority with missing path", () => {
  expect(isUri("1http:////foo.html")).toBeFalsy();
});

test("isUri - scheme begins with letter", () => {
  expect(isUri("$https://example.com/foo")).toBeFalsy();
});

test("isUri - query", () => {
  expect(isUri("https://example.com/foo?bar")).toMatchInlineSnapshot(
    `"https://example.com/foo?bar"`,
  );
});

test("isUri - fragment", () => {
  expect(isUri("https://example.com/foo#bar")).toMatchInlineSnapshot(
    `"https://example.com/foo#bar"`,
  );
});

test("isAddress - valid addresses", () => {
  expect(isAddress(account.address)).toBeTruthy();
  expect(isAddress(otherAccount.address)).toBeTruthy();
});

test("isAddress - invalid addresses", () => {
  expect(isAddress("not-an-address")).toBeFalsy();
  expect(isAddress("")).toBeFalsy();
  expect(isAddress(`0x${account.address}`)).toBeFalsy();
  expect(isAddress(account.address.toLowerCase())).toBeFalsy();
  expect(isAddress(`${account.address.slice(0, -1)}A`)).toBeFalsy();
});

test("isAddressEqual - equivalent spellings", () => {
  expect(isAddressEqual(account.address, account.address)).toBeTruthy();
  expect(
    isAddressEqual(account.address, account.address.replace(/0/g, "O")),
  ).toBeTruthy();
  expect(
    isAddressEqual(account.address, account.address.replace(/1/g, "I")),
  ).toBeTruthy();
  expect(
    isAddressEqual(account.address, account.address.replace(/1/g, "L")),
  ).toBeTruthy();
});

test("isAddressEqual - different addresses", () => {
  expect(isAddressEqual(account.address, otherAccount.address)).toBeFalsy();
});

test("isAddressEqual - invalid address", () => {
  expect(() => isAddressEqual("not-an-address", account.address))
    .toThrowErrorMatchingInlineSnapshot(`
    [InvalidAddressError: Address "not-an-address" is invalid.]
  `);
  expect(() => isAddressEqual(account.address, "not-an-address"))
    .toThrowErrorMatchingInlineSnapshot(`
    [InvalidAddressError: Address "not-an-address" is invalid.]
  `);
});

test("getAddress - returns the canonical address", () => {
  expect(getAddress(account.address)).toBe(account.address);
  expect(getAddress(account.address.replace(/0/g, "O"))).toBe(account.address);
  expect(getAddress(account.address.replace(/1/g, "I"))).toBe(account.address);
  expect(getAddress(account.address.replace(/1/g, "L"))).toBe(account.address);
});

test("getAddress - invalid address", () => {
  expect(() => getAddress("not-an-address"))
    .toThrowErrorMatchingInlineSnapshot(`
    [InvalidAddressError: Address "not-an-address" is invalid.]
  `);
});
