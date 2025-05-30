import { defineConfig, type UserConfig, type UserConfigFn } from "tsdown";

const config: UserConfigFn | UserConfig = defineConfig({
  entry: ["src/index.ts"],
  sourcemap: true,
  clean: true,
  dts: true,
  platform: "neutral",
});

export default config;
