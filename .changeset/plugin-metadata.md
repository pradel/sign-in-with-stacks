---
"sign-in-with-stacks": minor
---

Polish better-auth plugin metadata.

- Rename the plugin id from `sign-in-with-stacks` to `siws`, matching the client plugin
- Expose the plugin `version` and `options`, and register the plugin in `BetterAuthPluginRegistry`
- Add an index on `walletAddress.userId` and declare the client `pathMethods`
