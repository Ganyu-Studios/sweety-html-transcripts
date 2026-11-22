/** @jsx h */
/** @jsxFrag Fragment */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import type { APIMessage } from 'discord-api-types/v10';
import {
  createTranscript,
  createTranscripts,
  discordjs,
  ExportReturnType,
  render,
  seyfert,
  TRANSCRIPT_VERSION,
} from '../../src';
import { h, raw, renderChild } from '../../src/render/jsx';
import { alice, bob, CHANNEL_ID, fakeAdapter, message, moderator } from '../fixtures';

test('jsx escapes text and attributes, and only raw() bypasses it', () => {
  const html = renderChild(
    <div title={'"><script>'} hidden={false} open>
      {'<b>&</b>'}
      {raw('<i>ok</i>')}
      {null}
      {[1, ' ', 2]}
    </div>
  );
  assert.equal(html, '<div title="&quot;&gt;&lt;script&gt;" open>&lt;b&gt;&amp;&lt;/b&gt;<i>ok</i>1 2</div>');
  assert.equal(renderChild(<br />), '<br>');
});

test('fetch paginates oldest-first and honours limit and filter', async () => {
  const messages = Array.from({ length: 250 }, (_, i) => message({ content: `m${i}` }));
  const adapter = fakeAdapter(messages);
  const transcripts = createTranscripts(adapter);

  const all = await transcripts.fetch(CHANNEL_ID);
  assert.equal(all.messages.length, 250);
  assert.equal(all.messages[0]!.content, 'm0', 'oldest first');
  assert.equal(adapter.calls.filter((route) => route.endsWith('/messages')).length, 3);

  const limited = await transcripts.fetch(CHANNEL_ID, { limit: 120 });
  assert.equal(limited.messages.length, 120);
  assert.equal(limited.messages.at(-1)!.content, 'm249', 'limit keeps the newest messages');

  const filtered = await transcripts.fetch(CHANNEL_ID, { filter: (item) => item.content.endsWith('0') });
  assert.equal(filtered.messages.length, 25);
});

test('fetch resolves each member once, and replies come inline without extra requests', async () => {
  const original = message({ author: bob, content: 'original' });
  const messages: APIMessage[] = [original];
  for (let i = 0; i < 50; i++) {
    messages.push(
      message({
        author: i % 2 ? alice : bob,
        type: 19,
        content: `reply ${i}`,
        referenced_message: original,
        message_reference: { message_id: original.id, channel_id: CHANNEL_ID },
      })
    );
  }

  const adapter = fakeAdapter(messages, { [alice.id]: { nick: 'Ali', roles: [moderator.id] } });
  const transcript = await createTranscripts(adapter).fetch(CHANNEL_ID);

  const memberCalls = adapter.calls.filter((route) => route.includes('/members/'));
  assert.equal(memberCalls.length, 2, 'one member request per distinct user');
  assert.ok(!adapter.calls.some((route) => /\/messages\/\d+$/.test(route)), 'no per-message refetch');
  assert.equal(transcript.members[alice.id]?.nick, 'Ali');
  assert.equal(transcript.members[bob.id], undefined, 'a user that is not a member is simply absent');
});

test('the transcript is plain JSON and renders the same after a round trip', async () => {
  const transcripts = createTranscripts(fakeAdapter([message({ content: 'hello **there**' })]));
  const transcript = await transcripts.fetch(CHANNEL_ID);

  assert.equal(transcript.version, TRANSCRIPT_VERSION);
  const copy = JSON.parse(JSON.stringify(transcript));
  assert.equal(render(copy), render(transcript), 'render is pure');
});

test('render writes the attributes the components actually read', async () => {
  const messages = [
    message({ content: '<:wave:123456789012345678>' }),
    message({
      attachments: [1, 2, 3].map((n) => ({
        id: String(n),
        filename: `${n}.png`,
        size: 1,
        url: `https://cdn.example/${n}.png`,
        proxy_url: `https://cdn.example/${n}.png`,
        width: 10,
        height: 10,
        content_type: 'image/png',
      })),
    }),
  ];
  const transcripts = createTranscripts(fakeAdapter(messages, { [alice.id]: { roles: [moderator.id] } }));
  const html = transcripts.render(await transcripts.fetch(CHANNEL_ID));

  assert.match(
    html,
    /<discord-custom-emoji name="wave" url="https:\/\/cdn\.discordapp\.com\/emojis\/123456789012345678\.png" jumbo>/
  );
  assert.match(html, /<discord-media-gallery size="3">/);
  assert.match(html, /slot="media-3"/);
  assert.match(html, /"roleColor":"#ff0000"/, 'profiles carry the role color');
});

test('locales and options change the document', async () => {
  const transcripts = createTranscripts(fakeAdapter([message({ content: 'hola' })]));
  const transcript = await transcripts.fetch(CHANNEL_ID);

  const es = transcripts.render(transcript, { locale: 'es', theme: 'light', title: 'Ticket #42' });
  assert.match(es, /Se exportó 1 mensaje\./);
  assert.match(es, /<title>Ticket #42<\/title>/);
  assert.match(es, /<discord-messages light-theme/);

  const custom = transcripts.render(transcript, { footer: 'Saved {number} message{s}', poweredBy: false });
  assert.match(custom, /Saved 1 message /);
  assert.ok(!custom.includes('Powered by'));
});

test('attachment() wraps the html in the adapter file type', async () => {
  const transcripts = createTranscripts(fakeAdapter([message({ content: 'x' })]));
  const file = await transcripts.attachment(CHANNEL_ID, { filename: 'ticket-42.html' });

  assert.equal(file.name, 'ticket-42.html');
  assert.match(file.data.toString(), /^<!DOCTYPE html>/);
});

test('library adapters only reshape the request', async () => {
  const seen: unknown[] = [];

  const djs = discordjs({
    rest: { get: async (route, options) => (seen.push([route, options?.query?.toString()]), []) },
  });
  await djs.get('/channels/1/messages', { limit: 100, before: undefined });

  const sey = seyfert({
    rest: { request: async (method, url, options) => (seen.push([method, url, options]), [] as never) },
  });
  await sey.get('/channels/1/messages', { limit: 100 });

  assert.deepEqual(seen, [
    ['/channels/1/messages', 'limit=100'],
    ['GET', '/channels/1/messages', { query: { limit: '100' } }],
  ]);
  assert.deepEqual(djs.file!(Buffer.from('a'), 'a.html'), { attachment: Buffer.from('a'), name: 'a.html' });
  assert.deepEqual(sey.file!(Buffer.from('a'), 'a.html'), { data: Buffer.from('a'), filename: 'a.html' });
});

test('the 0.x createTranscript still works on top of the new API', async () => {
  const adapter = fakeAdapter([message({ content: 'legacy' })]);
  const html = await createTranscript({ adapter, channel: { id: CHANNEL_ID }, returnType: ExportReturnType.String });

  assert.equal(typeof html, 'string');
  assert.match(html, /legacy/);
});

test('server mode pre-renders shadow roots with deduplicated styles', async (t) => {
  const transcripts = createTranscripts(fakeAdapter([message({ content: 'one' }), message({ content: 'two' })]));
  const transcript = await transcripts.fetch(CHANNEL_ID);

  let html: string;
  try {
    html = await transcripts.render(transcript, { mode: 'server' });
  } catch (error) {
    // CI installs the published core, which may predate the ./ssr entry.
    t.skip(`core ./ssr entry unavailable: ${String(error).slice(0, 120)}`);
    return;
  }

  assert.match(html, /<template shadowroot(mode)?="open"/);
  assert.ok(
    !/<template shadowroot(?:mode)?="open"[^>]*><style>[^<]/.test(html),
    'component css is not inlined per instance'
  );
  assert.match(html, /<style data-s="\d+"><\/style>/);
  assert.match(html, /id="sweety-styles"/);
  assert.ok(!html.includes('lit-part'), 'hydration markers are stripped');

  // The client bundle must be the core that rendered the markup: an older bundle cannot take over
  // server-rendered components and renders a second copy next to them.
  const installed = JSON.parse(
    readFileSync(join(dirname(require.resolve('@penwin/discord-components-core')), '..', 'package.json'), 'utf8')
  ) as { version: string };
  assert.ok(
    html.includes(`@penwin/discord-components-core@${installed.version}/dist/bundle/index.mjs`),
    `server mode should load the installed core bundle (${installed.version})`
  );
});
