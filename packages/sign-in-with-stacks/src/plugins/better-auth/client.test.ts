import { expect, test } from "vitest";
import { siwsClient } from "./client.js";

test("siwsClient returns a plugin with the correct id", () => {
  const plugin = siwsClient();
  expect(plugin.id).toBe("siws");
});
