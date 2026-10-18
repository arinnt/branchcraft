# Branchcraft

Branchcraft is a browser game for learning Git and GitHub by moving jars, joining pipes, and watching a commit graph grow. It is built with TypeScript, HTML5 Canvas, and Vite; visuals and audio are generated in the browser. It has no backend and does not load external assets.

## Play locally

```sh
npm install
npm run dev
```

Run `npm test` to check the graph operations (requires Node.js 22.6 or newer).

Complete a physical workshop action in each module, review the term and command, then answer all three quiz questions to unlock the next term. Progress is saved in local storage when the browser allows it. The glossary lists unlocked terms, their definitions, metaphors, and commands. Sandbox mode is an open jar-and-pipe playground.

## Build and deploy

```sh
npm run build
npx wrangler deploy
```

The build outputs static assets to `dist/`. `wrangler.toml` configures Cloudflare Workers static assets with single-page fallback. GitHub Actions deploys on pushes to `main`; configure repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Lessons

Repository · Clone · Commit · Branch · Checkout/Switch · Merge · Merge Conflict · Push · Fetch vs Pull · Fork · Pull Request · Rebase · Stash · Revert vs Reset · Tag/Release · `.gitignore` · HEAD
