import { build } from "esbuild";
import copy from "esbuild-plugin-copy";
import { rmSync } from "fs";

rmSync("./dist", { recursive: true, force: true });

await build({
  entryPoints: ["./src/main.js"],
  bundle: true,
  minify: false,
  sourcemap: false,
  target: ["chrome90", "firefox90", "safari14", "edge90"],
  outdir: "./dist",
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
  plugins: [
    copy({
      assets: [{ from: "./public/**/*", to: "./" }],
    }),
  ],
});
