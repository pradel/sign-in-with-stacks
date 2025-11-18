import { createAuthClient } from "better-auth/react";
import { siwsClient } from "./siws";

export const authClient = createAuthClient({
  plugins: [siwsClient()],
});
