import { type AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifySiwsMessage } from "sign-in-with-stacks";

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Stacks",
      credentials: {
        address: {
          label: "Address",
          type: "text",
          placeholder: "0x0",
        },
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature",
          type: "text",
          placeholder: "0x0",
        },
        csrfToken: {
          type: "hidden",
        },
      },
      async authorize(credentials) {
        try {
          const address = credentials?.address || "";
          const message = credentials?.message || "";
          const signature = credentials?.signature || "";
          const nonce = credentials?.csrfToken;

          const valid = verifySiwsMessage({
            address,
            message,
            signature,
            nonce,
            domain: "example.com",
          });

          if (valid) {
            return {
              id: address,
            };
          }

          return null;
        } catch (error) {
          console.error("Error verifying SIWS message:", error);
          return null;
        }
      },
    }),
  ],
};

/**
 * Helper function to get the session on the server without having to import the authOptions object every single time
 * @returns The session object or null
 */
const getSession = () => getServerSession(authOptions);

export { authOptions, getSession };
