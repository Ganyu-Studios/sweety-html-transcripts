# Tests

Two kinds of thing live here, kept apart:

## `unit/` — the automated suite

Self-contained tests that need no token and no network. They run on Node's
built-in test runner through `tsx`, and this is what CI runs on every push and
pull request.

```bash
pnpm test              # the whole suite
```

Files are named `*.test.ts`, so `pnpm test` picks up anything added under
`unit/` automatically. To run a subset, point `tsx --test` at a single file, or
filter by name:

```bash
tsx --test tests/unit/list-rule.test.ts
tsx --test --test-name-pattern="blank line" tests/unit/*.test.ts
```

## `generators/` — manual smoke generators

Not part of the suite or CI. They render with the 1.x API: `createTranscripts(adapter)`,
then `fetch` and `render` timed separately, with the number of API calls the fetch took.

```bash
pnpm generate:seyfert  # a real channel, through the seyfert adapter
pnpm generate:djs      # a real channel, through the discord.js adapter
pnpm generate:sample   # a synthetic transcript, no token needed: writes client.html and server.html
```

The bot generators read their settings from `.env` (copy `.env.example`):

| Variable               | Default        | What it does                                                 |
| ---------------------- | -------------- | ------------------------------------------------------------ |
| `TOKEN`, `CHANNEL`     |                | The bot and the channel to export                            |
| `LIMIT`                | `30`           | Newest messages to fetch, `-1` for the whole channel         |
| `SSR`                  | `false`        | `true` renders on the server (`mode: 'server'`)              |
| `SEND_TRANSCRIPT_TEST` | `true`         | `false` writes `OUTPUT` instead of sending it to the channel |
| `OUTPUT`               | `./index.html` | Where to write the HTML when not sending                     |
| `THEME`, `LOCALE`      | `dark`, `en`   | Render options                                               |

```bash
SSR=true SEND_TRANSCRIPT_TEST=false pnpm generate:seyfert
```
