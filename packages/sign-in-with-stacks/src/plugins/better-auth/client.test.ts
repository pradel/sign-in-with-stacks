import { expect, test } from "vitest";
import { siwsClient } from "./client.js";

test("siwsClient returns a plugin with the correct id", () => {
  const plugin = siwsClient();
  expect(plugin.id).toBe("siws");
});

test("siwsClient declares the endpoint methods", () => {
  const plugin = siwsClient();
  expect(plugin.pathMethods).toEqual({
    "/siws/nonce": "POST",
    "/siws/verify": "POST",
  });
});
