import type { BetterAuthClientPlugin } from "better-auth";
import type { siws } from "./plugin.js";

export const siwsClient = () => {
  return {
    id: "siws",
    $InferServerPlugin: {} as ReturnType<typeof siws>,
    pathMethods: {
      "/siws/nonce": "POST",
      "/siws/verify": "POST",
    },
  } satisfies BetterAuthClientPlugin;
};
