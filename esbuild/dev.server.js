import { context } from "esbuild";
import copy from "esbuild-plugin-copy";

const ctx = await context({
  entryPoints: ["./src/main.js"],
  bundle: true,
  minify: false,
  sourcemap: true,
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

await ctx.watch();

const { host, port } = await ctx.serve({
  servedir: "./dist",
  port: 8080,
});

console.log(`Dev server running at http://${host}:${port}`);
