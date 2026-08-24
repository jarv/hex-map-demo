# AGENTS.md

## Project Overview

This is a Phaser 4 hex map fog-of-war demo built with vanilla JavaScript and esbuild.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server with live reload
npm run build     # build to dist/
```

## Structure

- `src/main.js` - entry point
- `src/scenes/` - Phaser scenes (Loading, Generating, Game)
- `src/constants.js` - shared constants
- `public/` - static assets
- `esbuild/` - build scripts
- `dist/` - build output (not committed)

## Notes

- No test framework is configured; verify changes by running `npm run dev` and testing in the browser.
- The project uses ES modules (`"type": "module"` in package.json).
- Do not commit `dist/` or `node_modules/`.
