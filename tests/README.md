# Tests

Two kinds of thing live here, kept apart:

## `unit/` — the automated suite

Self-contained tests that need no token and no network. They run on Node's
built-in test runner through `tsx`, and this is what CI runs on every push and
pull request.

```bash
pnpm test              # the whole suite
pnpm test:list         # just the markdown list rule
pnpm test:escape       # just the <script> escaping
```

Files are named `*.test.ts`, so `pnpm test` picks up anything added under
`unit/` automatically.

## `generators/` — manual smoke generators

Scripts that spin up a real bot and render an actual channel to an HTML file, so
you can eyeball the output. They need a `TOKEN` in `.env` and are **not** part of
the suite or CI.

```bash
pnpm generate:seyfert  # render a channel with the seyfert adapter
pnpm generate:djs      # render a channel with the discord.js adapter
```
