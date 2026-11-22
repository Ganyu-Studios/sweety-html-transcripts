# Server rendering

By default the components render in the viewer's browser from the
[@penwin/discord-components-core](https://github.com/Ganyu-Studios/discord-components) bundle.
`mode: 'server'` pre-renders them to declarative shadow DOM instead, so the transcript paints
instantly and stays readable before (or without) the bundle. It costs file size, roughly 6× for a
large channel, and needs the optional dependency:

```shell
pnpm add @penwin/discord-components-core
```

```ts
const html = await transcripts.html(channelId, { mode: 'server' });
```

## How it works

1. The transcript is rendered to custom-element markup, as in client mode.
2. `@penwin/discord-components-core/ssr` expands every component through Lit SSR into
   declarative shadow DOM.
3. Each component's CSS, which Lit SSR repeats in every instance (about 80% of the output), is
   replaced by an index into one shared list, and Lit's hydration markers are dropped.
4. A small inline script adopts the shared style sheets into every shadow root, and attaches the
   shadow roots by hand in browsers without declarative shadow DOM.
5. The component bundle still loads and re-renders each component in place, which restores
   interactivity (spoilers, galleries, select menus, code highlighting).

Without JavaScript the transcript keeps its structure but loses the component styles, since the
shared sheets are applied by the inline script.
