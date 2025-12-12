import { createAuthClient } from "better-auth/react";
import { siwsClient } from "sign-in-with-stacks/plugins/better-auth/client";

export const authClient = createAuthClient({
  plugins: [siwsClient()],
});
