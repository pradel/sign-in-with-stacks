import { betterAuth } from "better-auth";
import { siws } from "sign-in-with-stacks/plugins";

export const auth = betterAuth({
  // Replace this with your own secret in a real project
  secret: "EWpuzP0+Gq3NyTF/0QA/Myes+ttAYaz2rQFgVf75pW4=",
  plugins: [
    siws({
      domain: "localhost:3000",
    }),
  ],
});
