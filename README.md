# Branchcraft

Branchcraft is a browser game where **the commit graph is the game**. Build history, move branch pointers, resolve conflicts, and compare your repository with an outlined goal graph. Built with TypeScript, an accessible interactive SVG canvas, and Vite. Everything runs locally in your browser; no real Git commands execute and no backend or external assets are required.

## Play locally

```sh
npm install
npm run dev
```
Run `npm test` for operation, goal-matching, persistence, and lesson-solution tests (Node.js 22.6 or newer).

## Play the graph

- Click a commit to select it. Click a branch label to check it out. The status bar distinguishes HEAD, the working tree, and the index.
- Edit a file, stage it, and commit. Enter a branch or tag name in the name field before creating one; that field also supplies commit messages.
- Merge the selection into HEAD, rebase HEAD onto it, reset to it, revert it, or cherry-pick it. Branch creation does not automatically switch branches.
- Fetch copies the existing origin history into remote-tracking refs. Pull fetches and integrates it; push updates the server only when fast-forward rules allow. Clone starts from a level's empty local repository.
- Stash/pop preserves unfinished work. Tag marks a commit; Ignore file updates `.gitignore`. Conflicts require editing the affected file, staging, and committing.
- Every attempt appears in the live terminal, including rejected operations. Unsafe checkouts, conflicting changes, and non-fast-forward pushes are rejected rather than silently succeeding.

Each of the 17 challenges supplies a starting repository, a goal, task text, a hint, and a reset button. Completion checks reachable graph topology, named branches, HEAD (including detached HEAD), remote and tracking refs, tags, and working-state conditions—not a click counter. Commit IDs and messages need not match the goal. Old unreachable objects left by reset or rebase do not prevent completion. Three questions about the graph you built unlock the next challenge.

The glossary contains unlocked Git terms and command reminders. Course progress uses `branchcraft-save-v2` in localStorage. Old liquid-workshop progress is intentionally reset because its completion criteria no longer apply; unavailable or malformed storage never prevents play.

### Sandbox and keyboard

Sandbox has every action unlocked, a separate repository, undo/redo, and downloadable plain-text command history. Rejected commands are included in history. Switch between lessons and sandbox without losing either repository during the session.

Tab reaches commits, branch labels, inputs, and controls. Arrow keys move commit selection; Enter checks out the focused commit or branch, and Space selects a commit. Outside input fields: **E** edits, **S** stages, **C** commits, **B** creates a branch, and **M** merges. Current working-state actions are highlighted, but invalid actions remain available so you can learn from errors. Motion respects the reduced-motion preference.

### Simulation boundaries

This is an educational Git model, not a shell: files are text snapshots, overlapping edits can conflict, and origin is an in-memory server with separate refs. Initialization represents Git's unborn branch with an empty root commit. Conflicting rebases are rejected atomically; ordinary merge/cherry-pick/revert conflicts expose files for resolution. Fork and pull-request lessons explain GitHub collaboration through local branch integration; they do not pretend that `git fork` or `git pull-request` exists. Tags are local Git refs, not published GitHub releases. Reset is a mixed reset: move HEAD, preserve working files, and unstage.

## Build and deploy

```sh
npm run build
npx wrangler deploy
```

The build outputs static assets to `dist/`. `wrangler.toml` configures Cloudflare Workers static assets with single-page fallback. GitHub Actions deploys on pushes to `main`; configure repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Lessons

Repository · Clone · Commit · Branch · Checkout/Switch · Merge · Merge Conflict · Push · Fetch vs Pull · Fork · Pull Request · Rebase · Stash · Revert vs Reset · Tag/Release · `.gitignore` · HEAD
