import type { BetterAuthClientPlugin } from "better-auth";
import type { siws } from ".";

export const siwsClient = () => {
  return {
    id: "siws",
    $InferServerPlugin: {} as ReturnType<typeof siws>,
  } satisfies BetterAuthClientPlugin;
};
