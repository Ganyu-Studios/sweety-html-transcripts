import assert from 'node:assert/strict';
import type { APIGuild, APIMessage, APIRole, APIUser } from 'discord-api-types/v10';
import { ExportReturnType, generateFromMessages, TranscriptAdapter } from '../src';
import type { AllAPIChannel, APIMessageData, GuildMemberData } from '../src/utils/channel';
import { stringifyForScript } from '../src/utils/utils';

// A raw U+2028 is still a line terminator inside a regular expression literal, and it is
// message content Discord happily carries, so it is built rather than typed.
const LS: string = String.fromCharCode(0x2028);
const PS: string = String.fromCharCode(0x2029);

// Exact output, so widening or narrowing the escape set fails here instead of being restated
// by the test.
assert.equal(stringifyForScript({ a: '<' }), '{"a":"\\u003c"}');
assert.equal(stringifyForScript({ a: '>' }), '{"a":"\\u003e"}');
assert.equal(stringifyForScript({ a: '&' }), '{"a":"\\u0026"}');
assert.equal(stringifyForScript({ a: LS }), '{"a":"\\u2028"}');
assert.equal(stringifyForScript({ a: PS }), '{"a":"\\u2029"}');

// JSON.stringify returns undefined, not a string, for undefined, functions, symbols and classes,
// and the replace would throw on it. `object` would still admit functions and classes, so the
// parameter is a record or an array. Nothing runs this file in CI, but typecheck does read it,
// so these are the assertions that hold.
type Parameter = Parameters<typeof stringifyForScript>[0];
const takesUndefined: undefined extends Parameter ? true : false = false;
const takesFunction: (() => void) extends Parameter ? true : false = false;
assert.equal(takesUndefined, false);
assert.equal(takesFunction, false);

// Every one of these is settable as a Discord nickname or global display name.
const cases: (Record<string, unknown> | readonly unknown[])[] = [
  { author: '</script><svg onload=alert(1)>' },
  { author: '<!--<script>' },
  { author: '</SCRIPT ><img src=x onerror=alert(1)>' },
  { author: 'line' + LS + 'sep' + PS + 'para' },
  { author: 'plain & ordinary <text>' },
  { author: '\ud800 lone surrogate' },
  { nested: { deep: ['</script>', '&amp;'] } },
  { '</script><b>': 'hostile text in a key rather than a value' },
];

for (const value of cases) {
  const serialized: string = stringifyForScript(value);

  // Asserted on the text the generator emits, not on the escape set.
  const emitted: string = `<script>window.$discordMessage={profiles:${serialized}}</script>`;

  assert.equal(emitted.match(/<\/script/gi)?.length, 1, `closed the script element early: ${serialized}`);
  assert.ok(!emitted.includes('<!--'), `opened a comment the tokenizer follows: ${serialized}`);
  assert.deepEqual(JSON.parse(serialized), value, 'the value must survive the round trip unchanged');
}

// The cases above protect the helper. This one protects the fix: it renders a real transcript and
// checks the document, so reverting a call site back to JSON.stringify fails here even though
// every assertion above still passes.
const PAYLOAD = '</script><svg onload=alert(1)>';

const user: APIUser = { id: '1', username: 'fixture', discriminator: '0', global_name: PAYLOAD, avatar: null };
const role = { id: '2', name: PAYLOAD, color: 0, position: 1 } as unknown as APIRole;
const channel = { id: '3', guild_id: '4', name: PAYLOAD, type: 0 } as unknown as AllAPIChannel;
const guild = { id: '4', name: PAYLOAD, roles: [role], icon: null } as unknown as APIGuild;
const member = { nick: PAYLOAD, roles: [role.id], user } as unknown as GuildMemberData;

const message = {
  id: '5',
  channel_id: '3',
  guild_id: '4',
  author: user,
  content: PAYLOAD,
  timestamp: '2025-01-01T00:00:00.000Z',
  edited_timestamp: null,
  type: 0,
  tts: false,
  mention_everyone: false,
  mentions: [],
  mention_roles: [],
  attachments: [],
  embeds: [],
  pinned: false,
  // A user select menu, so the render reaches the three select menu script blobs in
  // components.tsx as well as the profiles blob in index.tsx. ActionRow is 1, UserSelect is 5.
  // User, role and channel select menus, so the render reaches all three select menu script
  // blobs in components.tsx as well as the profiles blob in index.tsx. ActionRow is 1, and
  // UserSelect, RoleSelect and ChannelSelect are 5, 6 and 8.
  components: [
    { type: 1, components: [{ type: 5, custom_id: 'user' }] },
    { type: 1, components: [{ type: 6, custom_id: 'role' }] },
    { type: 1, components: [{ type: 8, custom_id: 'channel' }] },
  ],
} as unknown as APIMessageData;

// Only the shapes the generator reaches for are filled in, so the fixture is cast rather than
// built out in full. It needs no token and no network.
class FixtureAdapter extends TranscriptAdapter<null> {
  resolveChannel(): AllAPIChannel {
    return channel;
  }
  resolveUser(): APIUser {
    return user;
  }
  resolveRole(): APIRole {
    return role;
  }
  resolveGuild(): APIGuild {
    return guild;
  }
  resolveMessage(): null {
    return null;
  }
  listChannelMessages(): APIMessage[] {
    return [];
  }
  createTranscriptAttachment(html: string): string {
    return html;
  }
  resolveGuildRoles(): APIRole[] {
    return [role];
  }
  resolveGuildMember(): GuildMemberData {
    return member;
  }
  resolveGuildChannels(): AllAPIChannel[] {
    return [channel];
  }
}

async function rendersSafely(): Promise<void> {
  const html: string = String(
    await generateFromMessages([message], {
      adapter: new FixtureAdapter(null),
      channel,
      returnType: ExportReturnType.String,
      poweredBy: false,
    })
  );

  const opened: number = html.match(/<script[\s>]/gi)?.length ?? 0;
  const closed: number = html.match(/<\/script/gi)?.length ?? 0;

  assert.equal(closed, opened, `a payload closed a script element early: ${opened} opened, ${closed} closed`);
  assert.ok(!html.includes('<svg'), 'the payload reached the document as markup');
  assert.ok(html.includes('\\u003c'), 'the profiles blob should carry the escaped form');

  console.info('stringifyForScript: %d cases, plus a rendered transcript, are safe to inline.', cases.length);
}

void rendersSafely();
