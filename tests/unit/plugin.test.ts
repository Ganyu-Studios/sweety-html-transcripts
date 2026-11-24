import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Client, definePlugins } from 'seyfert';
import type { SeyfertFile } from '../../src/adapters/seyfert';
import type { ChannelTranscripts, SeyfertTranscripts } from '../../src/plugin';
import { transcriptsPlugin } from '../../src/plugin';
import { alice, CHANNEL_ID, fakeAdapter, message } from '../fixtures';

function clientWith(plugin: ReturnType<typeof transcriptsPlugin>) {
  const client = new Client({ plugins: definePlugins(plugin) });
  const api = fakeAdapter([message({ content: 'from the plugin' })]);

  // Swap REST for the fake API after construction, as seyfert's own setServices would.
  Object.assign(client, {
    rest: {
      request: (_method: string, route: `/${string}`, options?: { query?: Record<string, string> }) =>
        api.get(route, options?.query),
    },
  });

  return { client, api };
}

test('the plugin adds client.transcripts, bound to the client REST', async () => {
  const { client, api } = clientWith(transcriptsPlugin({ render: { title: 'From the plugin' } }));

  // Typed from the plugins passed to the client, with no registry augmentation.
  const transcripts: SeyfertTranscripts = client.transcripts;
  const html = await transcripts.html(CHANNEL_ID);

  assert.match(html, /from the plugin/);
  assert.match(html, /<title>From the plugin<\/title>/, 'render defaults from the options apply');
  assert.ok(api.calls.includes(`/channels/${CHANNEL_ID}/messages`), 'requests go through the swapped REST');

  const file: SeyfertFile = await transcripts.attachment(CHANNEL_ID, { filename: 'ticket.html' });
  assert.equal(file.filename, 'ticket.html');
  assert.ok(file.data.toString().includes('from the plugin'));
});

test('the plugin reads the cache seyfert has at request time, not at construction', async () => {
  const { client } = clientWith(transcriptsPlugin());
  const cache = client.transcripts.adapter.cache!;

  assert.equal(await cache.user!(alice.id), undefined, 'the fresh client cache has nothing');

  Object.assign(client, { cache: { users: { raw: async (id: string) => (id === alice.id ? alice : undefined) } } });
  assert.deepEqual(await cache.user!(alice.id), alice, 'a cache set later is used');
});

test('the plugin can turn the cache off', () => {
  const { client } = clientWith(transcriptsPlugin({ cache: false }));
  assert.equal(client.transcripts.adapter.cache, undefined);
});

test('ctx.transcripts works on the channel the context runs in', async () => {
  const { client, api } = clientWith(transcriptsPlugin());

  // seyfert builds every command, component and modal context through options.context.
  const extend = (source: object) =>
    client.options.context!(source as Parameters<NonNullable<typeof client.options.context>>[0]) as {
      transcripts: ChannelTranscripts;
    };

  const ctx = extend({ channelId: CHANNEL_ID });
  assert.equal(ctx.transcripts.channelId, CHANNEL_ID);
  assert.equal(api.calls.length, 0, 'binding a context fetches nothing');

  const file = await ctx.transcripts.attachment({ filename: 'here.html' });
  assert.equal(file.filename, 'here.html');
  assert.ok(file.data.toString().includes('from the plugin'));
  assert.ok(api.calls.includes(`/channels/${CHANNEL_ID}/messages`));

  assert.equal(extend({ channel: { id: CHANNEL_ID } }).transcripts.channelId, CHANNEL_ID, 'falls back to channel.id');
  await assert.rejects(extend({}).transcripts.html(), /has no channel/);
});
