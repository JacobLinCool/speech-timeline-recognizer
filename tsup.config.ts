import { defineConfig } from "tsup";

export default defineConfig((options) => ({
    entry: ["src/str.ts"],
    outDir: "dist",
    target: "node18",
    format: ["cjs"],
    clean: true,
    splitting: false,
    minify: !options.watch,
    dts: options.watch ? false : { resolve: true },
}));
