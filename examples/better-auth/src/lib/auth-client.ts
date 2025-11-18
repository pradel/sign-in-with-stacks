import { createAuthClient } from "better-auth/react";
import { siwsClient } from "siws-better-auth";

export const authClient = createAuthClient({
  plugins: [siwsClient()],
});
