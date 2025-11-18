import { betterAuth } from "better-auth";
import { siws } from "siws-better-auth";

export const auth = betterAuth({
  plugins: [
    siws({
      domain: "localhost:3000",
    }),
  ],
});
