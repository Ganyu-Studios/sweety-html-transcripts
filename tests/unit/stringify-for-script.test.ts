import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { APIMessage } from 'discord-api-types/v10';
import { createTranscripts } from '../../src';
import { stringifyForScript } from '../../src/utils/utils';
import { alice, CHANNEL_ID, fakeAdapter, message } from '../fixtures';

// A raw U+2028 is still a line terminator inside a regular expression literal, and it is
// message content Discord happily carries, so it is built rather than typed.
const LS: string = String.fromCharCode(0x2028);
const PS: string = String.fromCharCode(0x2029);

test('escapes the exact set as \\uXXXX and nothing else', () => {
  // Exact output, so widening or narrowing the escape set fails here instead of being restated
  // by the test.
  assert.equal(stringifyForScript({ a: '<' }), '{"a":"\\u003c"}');
  assert.equal(stringifyForScript({ a: '>' }), '{"a":"\\u003e"}');
  assert.equal(stringifyForScript({ a: '&' }), '{"a":"\\u0026"}');
  assert.equal(stringifyForScript({ a: LS }), '{"a":"\\u2028"}');
  assert.equal(stringifyForScript({ a: PS }), '{"a":"\\u2029"}');
});

test('the parameter type rejects the values JSON.stringify drops', () => {
  // JSON.stringify returns undefined, not a string, for undefined, functions, symbols and classes,
  // and the replace would throw on it. `object` would still admit functions and classes, so the
  // parameter is a record or an array. These assertions are what typecheck holds to.
  type Parameter = Parameters<typeof stringifyForScript>[0];
  const takesUndefined: undefined extends Parameter ? true : false = false;
  const takesFunction: (() => void) extends Parameter ? true : false = false;
  assert.equal(takesUndefined, false);
  assert.equal(takesFunction, false);
});

test('hostile nicknames cannot close the script element or survive the round trip changed', () => {
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
});

// The cases above protect the helper. This one protects the fix: it renders a real transcript and
// checks the document, so reverting a call site back to JSON.stringify fails here even though
// every assertion above still passes.
const PAYLOAD = '</script><svg onload=alert(1)>';

test('a rendered transcript keeps every hostile payload inert', async () => {
  const hostile = { ...alice, global_name: PAYLOAD };
  const messages = [
    message({
      author: hostile,
      content: PAYLOAD,
      // User, role and channel select menus, so the render reaches the select menu data blob as
      // well as the profiles blob. ActionRow is 1; UserSelect, RoleSelect, ChannelSelect are 5, 6, 8.
      components: [
        { type: 1, components: [{ type: 5, custom_id: 'user' }] },
        { type: 1, components: [{ type: 6, custom_id: 'role' }] },
        { type: 1, components: [{ type: 8, custom_id: 'channel' }] },
      ],
    } as Partial<APIMessage>),
  ];

  const transcripts = createTranscripts(fakeAdapter(messages, { [alice.id]: { nick: PAYLOAD } }));
  const transcript = await transcripts.fetch(CHANNEL_ID);
  transcript.channel.name = PAYLOAD;
  transcript.guild!.name = PAYLOAD;
  for (const role of Object.values(transcript.roles)) role.name = PAYLOAD;

  const html = transcripts.render(transcript, { poweredBy: false });

  const opened: number = html.match(/<script[\s>]/gi)?.length ?? 0;
  const closed: number = html.match(/<\/script/gi)?.length ?? 0;

  assert.equal(closed, opened, `a payload closed a script element early: ${opened} opened, ${closed} closed`);
  assert.ok(!html.includes('<svg'), 'the payload reached the document as markup');
  assert.ok(html.includes('\\u003c'), 'the inline data should carry the escaped form');
  assert.ok(html.includes('$discordSelectMenu'), 'the select menu data blob should be rendered');
});
