import { defineConfig, type UserConfig, type UserConfigFn } from "tsdown";

const config: UserConfigFn | UserConfig = defineConfig({
  entry: ["src/index.ts", "src/client.ts"],
  sourcemap: true,
  clean: true,
  dts: true,
  publint: true,
  platform: "neutral",
});

export default config;
