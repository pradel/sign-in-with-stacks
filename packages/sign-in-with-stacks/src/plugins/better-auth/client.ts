import type { BetterAuthClientPlugin } from "better-auth";
import type { siws } from "./plugin.js";
import { PACKAGE_VERSION } from "../../version.js";

export const siwsClient = () => {
  return {
    id: "siws",
    version: PACKAGE_VERSION,
    $InferServerPlugin: {} as ReturnType<typeof siws>,
    pathMethods: {
      "/siws/nonce": "POST",
      "/siws/verify": "POST",
    },
  } satisfies BetterAuthClientPlugin;
};
