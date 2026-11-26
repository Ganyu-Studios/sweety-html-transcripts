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
import { alice, bob, CHANNEL_ID, fakeAdapter, GUILD_ID, message, moderator } from '../fixtures';

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

test('a separator without a divider is written as divider="false"', async () => {
  const separators = message({
    flags: 1 << 15,
    components: [
      { type: 14, id: 1, divider: false, spacing: 1 },
      { type: 14, id: 2, divider: true, spacing: 2 },
      { type: 14, id: 3, spacing: 1 },
    ],
  } as Partial<APIMessage>);
  const transcripts = createTranscripts(fakeAdapter([separators]));
  const html = transcripts.render(await transcripts.fetch(CHANNEL_ID));

  // The component defaults to drawing the line, so only false needs an attribute.
  assert.deepEqual(html.match(/<discord-separator[^>]*>/g), [
    '<discord-separator spacing="1" divider="false">',
    '<discord-separator spacing="2">',
    '<discord-separator spacing="1">',
  ]);
});

test('a forwarded message passes the author and time to the media viewer', async () => {
  const forwarded = message({
    message_reference: { type: 1, channel_id: CHANNEL_ID, message_id: '1' },
    message_snapshots: [
      {
        message: {
          type: 0,
          content: 'forwarded',
          timestamp: '2025-01-02T03:04:05.000Z',
          edited_timestamp: null,
          flags: 0,
          mentions: [],
          mention_roles: [],
          attachments: [],
          embeds: [],
          components: [],
        },
      },
    ],
  } as Partial<APIMessage>);
  const transcripts = createTranscripts(fakeAdapter([forwarded]));
  const html = transcripts.render(await transcripts.fetch(CHANNEL_ID));

  assert.match(
    html,
    new RegExp(
      `<discord-message id="m-${forwarded.id}-f0" profile="${alice.id}" timestamp="2025-01-02T03:04:05.000Z" raw-timestamp="2025-01-02T03:04:05.000Z" message-body-only>`
    )
  );
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

test('the adapter cache is read before REST, and REST fills every miss', async () => {
  const messages = [message({ author: alice, content: 'a' }), message({ author: bob, content: 'b' })];
  const adapter = fakeAdapter(messages, { [bob.id]: { nick: 'Bobby' } });
  adapter.cache = {
    channel: (id) => (id === CHANNEL_ID ? { id, type: 0, guild_id: GUILD_ID, name: 'cached-general' } : undefined),
    guild: (id) => ({ id, name: 'Cached Guild', icon: null }),
    roles: () => [moderator],
    // alice is cached; bob is not, and the cache throwing for him must not fail the transcript
    member: (_, userId) => {
      if (userId === alice.id) return { nick: 'Ali (cache)', roles: [moderator.id] } as never;
      throw new Error('cache backend down');
    },
  };

  const transcript = await createTranscripts(adapter).fetch(CHANNEL_ID);

  assert.equal(transcript.channel.name, 'cached-general');
  assert.equal(transcript.guild?.name, 'Cached Guild');
  assert.equal(transcript.members[alice.id]?.nick, 'Ali (cache)');
  assert.equal(transcript.members[bob.id]?.nick, 'Bobby', 'a cache error falls back to REST');

  assert.ok(!adapter.calls.includes(`/channels/${CHANNEL_ID}`), 'the channel came from the cache');
  assert.ok(!adapter.calls.includes(`/guilds/${GUILD_ID}`), 'the guild and roles came from the cache');
  assert.ok(!adapter.calls.includes(`/guilds/${GUILD_ID}/members/${alice.id}`), 'a cached member is not requested');
  assert.ok(adapter.calls.includes(`/guilds/${GUILD_ID}/members/${bob.id}`), 'a missed member is requested');
});

test('a cached guild without cached roles still asks REST for both', async () => {
  const adapter = fakeAdapter([message({ content: 'x' })]);
  adapter.cache = { guild: (id) => ({ id, name: 'Cached Guild', icon: null }), roles: () => [] };

  const transcript = await createTranscripts(adapter).fetch(CHANNEL_ID);

  assert.ok(adapter.calls.includes(`/guilds/${GUILD_ID}`));
  assert.equal(transcript.guild?.name, 'Test Guild');
  assert.ok(transcript.roles[moderator.id], 'roles come with the REST guild');
});

test('the discord.js adapter maps cached structures to raw shapes', async () => {
  const roles = new Map([
    [GUILD_ID, { id: GUILD_ID, name: '@everyone', color: 0, position: 0, icon: null }],
    [
      moderator.id,
      {
        id: moderator.id,
        name: 'Moderator',
        color: 0xff0000,
        colors: { primaryColor: 0xff0000, secondaryColor: null, tertiaryColor: null },
        position: 2,
        icon: null,
      },
    ],
  ]);
  const djsUser = {
    id: alice.id,
    username: 'alice',
    discriminator: '0',
    globalName: 'Alice',
    avatar: null,
    bot: false,
    flags: { bitfield: 0 },
    primaryGuild: null,
  };
  const member = { nickname: 'Ali', avatar: null, joinedAt: new Date(0), roles: { cache: roles }, user: djsUser };
  const guild = {
    id: GUILD_ID,
    name: 'Guild',
    icon: 'abc',
    roles: { cache: roles },
    channels: { cache: new Map() },
    members: { cache: new Map([[alice.id, member]]) },
  };
  const client = {
    rest: { get: async () => null },
    guilds: { cache: new Map([[GUILD_ID, guild]]) },
    channels: {
      cache: new Map([[CHANNEL_ID, { id: CHANNEL_ID, type: 0, name: 'general', guildId: GUILD_ID, parentId: null }]]),
    },
    users: { cache: new Map([[alice.id, djsUser]]) },
  };

  const cache = discordjs(client).cache!;

  assert.deepEqual(await cache.channel!(CHANNEL_ID), {
    id: CHANNEL_ID,
    type: 0,
    name: 'general',
    topic: null,
    guild_id: GUILD_ID,
    parent_id: null,
    owner_id: undefined,
  });
  assert.deepEqual(await cache.guild!(GUILD_ID), { id: GUILD_ID, name: 'Guild', icon: 'abc' });
  const cachedMember = (await cache.member!(GUILD_ID, alice.id)) as {
    nick: string;
    roles: string[];
    user: { global_name: string };
  };
  assert.equal(cachedMember.nick, 'Ali');
  assert.deepEqual(cachedMember.roles, [moderator.id], '@everyone is not a member role');
  assert.equal(cachedMember.user.global_name, 'Alice');
  assert.equal((await cache.roles!(GUILD_ID))!.find((r) => r.id === moderator.id)!.colors?.primary_color, 0xff0000);
  assert.equal(await cache.member!(GUILD_ID, bob.id), undefined, 'not cached is undefined, so REST is used');
  assert.equal(discordjs(client, { cache: false }).cache, undefined);
});

test('the seyfert adapter reads raw objects straight from client.cache', async () => {
  const client = {
    rest: { request: async () => null as never },
    cache: {
      members: { raw: async (id: string) => (id === alice.id ? { nick: 'Ali', roles: [] } : undefined) },
      users: { raw: async (id: string) => (id === alice.id ? alice : undefined) },
      channels: { raw: () => undefined, valuesRaw: () => [] },
    },
  };

  const cache = seyfert(client).cache!;

  assert.deepEqual(
    await cache.member!(GUILD_ID, alice.id),
    { nick: 'Ali', roles: [], user: alice },
    'the user is joined back'
  );
  assert.equal(await cache.member!(GUILD_ID, bob.id), undefined);
  assert.equal(await cache.guild!(GUILD_ID), undefined, 'a disabled resource is a miss');
  assert.equal(seyfert(client, { cache: false }).cache, undefined);
});

test('seyfert raw shorters fill the cache, so the next transcript only asks for messages', async () => {
  const api = fakeAdapter([message({ content: 'one' }), message({ author: bob, content: 'two' })], {
    [alice.id]: { nick: 'Ali' },
    [bob.id]: {},
  });

  // Shorters the way seyfert's behave: cached value, otherwise a request that is then cached.
  const cached = new Map<string, unknown>();
  const raw = async <T,>(key: string, route: `/${string}`): Promise<T> => {
    if (!cached.has(key)) cached.set(key, await api.get(route));
    return cached.get(key) as T;
  };
  const client = {
    rest: {
      request: <T,>(_method: string, route: `/${string}`, options?: { query?: Record<string, string> }) =>
        api.get<T>(route, options?.query),
    },
    channels: { raw: (id: string) => raw(`channel:${id}`, `/channels/${id}`) },
    guilds: { raw: (id: string) => raw(`guild:${id}`, `/guilds/${id}`) },
    roles: { listRaw: async (id: string) => (await raw<{ roles: unknown[] }>(`guild:${id}`, `/guilds/${id}`)).roles },
    members: { raw: (guildId: string, id: string) => raw(`member:${id}`, `/guilds/${guildId}/members/${id}`) },
    users: { raw: (id: string) => raw(`user:${id}`, `/users/${id}`) },
  };
  const transcripts = createTranscripts(seyfert(client));

  const first = await transcripts.fetch(CHANNEL_ID);
  assert.ok(api.calls.length > 1, 'the first transcript fetches the channel, guild and members');
  assert.equal(first.members[alice.id]?.nick, 'Ali');

  api.calls.length = 0;
  const second = await transcripts.fetch(CHANNEL_ID);
  assert.deepEqual(api.calls, [`/channels/${CHANNEL_ID}/messages`], 'everything else comes from the cache');
  assert.deepEqual(second.members, first.members);
});

test('an API error from a library lookup is final, not retried over REST', async () => {
  const api = fakeAdapter([message({ author: bob, content: 'left the server' })]);
  let asked = 0;
  const client = {
    rest: {
      request: <T,>(_method: string, route: `/${string}`, options?: { query?: Record<string, string> }) =>
        api.get<T>(route, options?.query),
    },
    members: {
      // seyfert's errors carry the response status in metadata.
      raw: async () => {
        asked++;
        throw Object.assign(new Error('Unknown Member'), { metadata: { status: 404 } });
      },
    },
  };
  const transcripts = createTranscripts(seyfert(client));

  const transcript = await transcripts.fetch(CHANNEL_ID);
  assert.equal(transcript.members[bob.id], undefined);
  assert.ok(!api.calls.some((route) => route.includes('/members/')), 'seyfert already got the 404');

  await transcripts.fetch(CHANNEL_ID);
  assert.equal(asked, 1, 'the 404 is remembered, so the next transcript does not ask again');
});

test('the discord.js adapter uses fetch(), which caches, for what is not cached yet', async () => {
  const fetched: string[] = [];
  const djsUser = {
    id: alice.id,
    username: 'alice',
    discriminator: '0',
    globalName: 'Alice',
    avatar: null,
    bot: false,
  };
  const roles = new Map([[moderator.id, { id: moderator.id, name: 'Moderator', color: 0, position: 1, icon: null }]]);
  const members = {
    cache: new Map<string, unknown>(),
    fetch: async (id: string) => {
      fetched.push(`member:${id}`);
      const member = { nickname: 'Ali', avatar: null, joinedAt: null, roles: { cache: roles }, user: djsUser };
      members.cache.set(id, member);
      return member;
    },
  };
  const guild = {
    id: GUILD_ID,
    name: 'Guild',
    icon: null,
    roles: {
      cache: new Map<string, unknown>(),
      fetch: async () => {
        fetched.push('roles');
        for (const [id, role] of roles) guild.roles.cache.set(id, role);
        return guild.roles.cache;
      },
    },
    channels: { cache: new Map() },
    members,
  };
  const guilds = {
    cache: new Map<string, unknown>(),
    fetch: async (id: string) => {
      fetched.push(`guild:${id}`);
      guilds.cache.set(id, guild);
      return guild;
    },
  };
  const client = {
    rest: { get: async () => Promise.reject(new Error('REST is not used here')) },
    guilds,
    channels: { cache: new Map() },
    users: { cache: new Map() },
  };

  const cache = discordjs(client).cache!;
  for (let i = 0; i < 2; i++) {
    assert.equal(((await cache.member!(GUILD_ID, alice.id)) as { nick: string }).nick, 'Ali');
    assert.equal((await cache.roles!(GUILD_ID))![0]!.name, 'Moderator');
  }

  assert.deepEqual(fetched, [`guild:${GUILD_ID}`, `member:${alice.id}`, 'roles'], 'each fetched once, then cached');
});
