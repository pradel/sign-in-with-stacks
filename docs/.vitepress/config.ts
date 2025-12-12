import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/sign-in-with-stacks/",
  title: "Sign-In with Stacks",
  description:
    "A library for creating and verifying Sign-In with Stacks messages",
  themeConfig: {
    sidebar: [
      {
        text: "Guide",
        items: [{ text: "Getting Started", link: "/" }],
      },
      {
        text: "Plugins",
        items: [
          { text: "Overview", link: "/plugins/" },
          { text: "Better Auth", link: "/plugins/better-auth" },
        ],
      },
      {
        text: "Examples",
        items: [
          {
            text: "Next.js + Better Auth",
            link: "https://github.com/pradel/sign-in-with-stacks/tree/main/examples/better-auth",
            target: "_blank",
          },
          {
            text: "Next.js + NextAuth.js",
            link: "https://github.com/pradel/sign-in-with-stacks/tree/main/examples/next-auth",
            target: "_blank",
          },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/pradel/sign-in-with-stacks",
      },
    ],
  },
});
