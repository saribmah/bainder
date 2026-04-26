# Init recipe (for AI agents)

You are about to initialize a fresh clone of `cf-bun-template`. The user said
something like "initialize this template", "set this up for my project", or
"run init". Follow this recipe end-to-end.

**Your tone**: warm, conversational, brief. The first step is a real
conversation about what they're building — don't make it feel like a form.
The mechanical questions later can be batched.

## Step 1 — Detect freshness

The template is **uninitialized** if any of these tokens still exist anywhere
in the repo (excluding `node_modules`, `.git`, and `.agents/`):

- `{{APP_NAME}}` — app/workspace name
- `{{WORKER_NAME}}` — Cloudflare worker name
- `{{DESCRIPTION}}` — package description
- `{{APP_DOMAIN}}` — production domain
- `@app/` — placeholder package scope (curly-brace placeholders aren't valid
  TS module specifiers, so `@app` stands in for the user's real scope in code)

Run:

```bash
grep -rl '{{\|@app/' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.agents
```

Also check for the marker block: if `<!-- PROJECT-CONTEXT:START -->` in
`AGENTS.md` still wraps the "Uninitialized" placeholder, the project
description hasn't been written yet.

If there are no matches AND the project blocks are populated, tell the user
the template is already initialized and stop.

## Step 2 — Understand what they're building (the conversation)

Open with one open-ended question. Don't bombard them with a form.

> _"Before we wire up the package names and Cloudflare config, tell me about
> what you're building. Don't worry about format — just describe it in your
> own words."_

Listen carefully to their answer. Extract:

- **A name slug** — lowercase, hyphenated, ≤30 chars. Example: `mango`,
  `daily-habit-tracker`
- **A one-line description** — ≤120 chars (roughly the GitHub repo
  description field). Crisp, evocative, no buzzwords.
- **A 2–3 sentence "About" paragraph** — what it is, in slightly more depth
- **3–5 primary capabilities** — bullet points, action-oriented
- **Target audience** — who's it for? Solo use, team, public users?

For each piece you couldn't extract clearly, ask a focused follow-up. Cap at
**two follow-ups** total — don't grill them.

Examples of good follow-ups:
- _"Got it. Quick one — who's it for? Just you, friends, or public users?"_
- _"What should I call this in package names? Slug-style, lowercase. Suggest:
  `<your-best-guess>`?"_

When you have everything, **read it back to confirm**:

> _"Here's what I've got:_
>
> - Name: `mango`
> - One-liner: 'A daily habit tracker that respects your time.'
> - About: ...
> - Capabilities: ...
> - For: solo developers and tinkerers
>
> _Sound right? Anything to tweak?"_

Wait for confirmation before continuing.

## Step 3 — Mechanical setup (batch these)

Now ask the configuration questions in one round. Default everything from
Step 2 — the user usually just confirms.

1. **Package scope** — npm-style scope with `@`. Default: `@<name>`.
   Workspace packages will be `@<scope>/api`, `@<scope>/sdk`, `@<scope>/web`.
2. **Cloudflare worker name** — default: `<name>`. Dev env becomes `<name>-dev`.
3. **Production domain** (optional) — e.g. `mango.app`. Skip → leave routes
   block empty so the worker uses `<name>.workers.dev`.
4. **Include the web frontend?** — default y. If n: delete `packages/web`,
   remove from workspaces, delete `assets` block in `wrangler.jsonc`.
5. **Initial git remote** (optional) — if provided, run
   `git remote add origin <url>` (do not push).

## Step 4 — Substitute placeholder tokens

Replace **every** occurrence of these tokens across the repo, excluding
`node_modules`, `.git`, and `.agents/`:

| Token             | Source                                    |
| ----------------- | ----------------------------------------- |
| `{{APP_NAME}}`    | name slug from Step 2                     |
| `@app`            | scope from Step 3 (e.g. `@mango`)         |
| `{{DESCRIPTION}}` | one-line description from Step 2          |
| `{{WORKER_NAME}}` | worker name from Step 3                   |
| `{{APP_DOMAIN}}`  | production domain (or leave commented out)|

Either run `find` + `sed` per token, or use the Edit tool file-by-file.
Verify with:

```bash
grep -rl '{{\|@app/' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.agents
```

Should produce no matches.

## Step 5 — Rewrite the project-intro blocks

This is the new, important part. Three files have explicit marker blocks
that you replace with the user's product description:

### `README.md`

Replace **everything between** `<!-- PROJECT-INTRO:START -->` and
`<!-- PROJECT-INTRO:END -->` with the user's product content. Use this
shape (substitute their values):

```markdown
<!-- PROJECT-INTRO:START -->

# <App Name>

<One-line description from Step 2>

## About

<2-3 sentence About paragraph>

## What it does

- <capability 1>
- <capability 2>
- <capability 3>

**For**: <target audience>

<!-- PROJECT-INTRO:END -->
```

Then **delete everything between** `<!-- TEMPLATE-ONLY:START -->` and
`<!-- TEMPLATE-ONLY:END -->`, including the markers themselves. Those
sections (template "What you get" / "Quick start") are template-only.

### `AGENTS.md`

Replace **everything between** `<!-- PROJECT-CONTEXT:START -->` and
`<!-- PROJECT-CONTEXT:END -->` with:

```markdown
<!-- PROJECT-CONTEXT:START -->

## About this project

<2-3 sentence About paragraph>

**What it does**:

- <capability 1>
- <capability 2>
- <capability 3>

**For**: <target audience>

See [`.agents/PROJECT.md`](./.agents/PROJECT.md) for the full project identity
(name, scope, current focus, notes).

<!-- PROJECT-CONTEXT:END -->
```

### `.agents/PROJECT.md`

Fill in every `_filled by init_` placeholder under "Identity". Then write
the "What it is", "What it does", "Who it's for" sections from the user's
answers. Leave "Current focus" and "Notes" empty (the team fills those over
time).

## Step 6 — Install + verify

The shipped `bun.lock` references the placeholder package names. Delete it
before reinstalling so the lockfile gets regenerated under the real names.

```bash
rm -f bun.lock
bun install
bun run --filter '*/api' cf-typegen   # regenerate worker-configuration.d.ts
bun run --filter '*/sdk' build        # regenerate the SDK from the API
bun run lint
bun run ts-check
bun run test
```

Fix anything that fails before declaring done. Common issues:
- `tsgo` complaining about missing types → run cf-typegen
- `tsgo` failing to resolve `@app/sdk` → confirm Step 4 substituted `@app` to
  the user's real scope in `package.json`s, `sdk.provider.tsx`, and `.oxlintrc.json`
- oxlint complaining about the no-restricted-imports pattern → make sure
  `.oxlintrc.json` has the actual scope, not `@app`

## Step 7 — Initial commit

If the user provided a remote in Step 3, wire it up but **do not push**:

```bash
git init                        # only if not already a git repo
git remote add origin <url>     # only if a remote was provided
git add -A
git commit -m "chore: initialize from cf-bun-template"
```

## Step 8 — Self-cleanup

Delete this file (`.agents/init.md`) — it's only useful pre-init. Keep the
other `.agents/*.md` files; those are ongoing recipes.

```bash
rm .agents/init.md
```

## Step 9 — Tell the user what's next

Print a short summary:

- ✅ Initialized as **`<app name>`** — `<scope>/api`, `<scope>/sdk`, `<scope>/web`
- ✅ Project description written to `README.md`, `AGENTS.md`, and `.agents/PROJECT.md`
- ✅ `bun install` + lint + ts-check + test all green
- Next: copy `.env.example` to `.env` (or create one) with `JWT_SECRET=<random>`
- Next: `bun run --filter <scope>/api dev` to start the API on `:8787`
- Next: `bun run --filter <scope>/web dev` to start the web app on `:3002`
- Reference: `AGENTS.md` for canonical patterns; `.agents/add-feature.md` to add a feature
