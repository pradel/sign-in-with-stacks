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
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/pradel/sign-in-with-stacks",
      },
    ],
  },
});
