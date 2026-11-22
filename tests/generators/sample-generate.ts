/**
 * Render a synthetic transcript that exercises most features, in both modes, with no bot token.
 *
 *   pnpm generate:sample [outDir] [repeat]
 *
 * Writes client.html and server.html, and prints sizes and timings.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { APIMessage } from 'discord-api-types/v10';
import { createTranscripts } from '../../src';
import { alice, bob, bot, CHANNEL_ID, fakeAdapter, message, moderator } from '../fixtures';

const outDir = process.argv[2] ?? 'sample-output';
const repeat = Number(process.argv[3] ?? 1);

function sampleMessages(): APIMessage[] {
  const first = message({
    content:
      '# Welcome\nHello **world**, this is _markdown_ with `code`, ~~strike~~ and ||a spoiler||.\n- one\n- two\n  - nested',
  });

  return [
    message({ type: 7, content: '' }),
    first,
    message({
      author: bob,
      type: 19,
      content: `Replying to <@${alice.id}>, ping <@&${moderator.id}> in <#${CHANNEL_ID}> :) <t:1763632800:R>`,
      referenced_message: first,
      message_reference: { message_id: first.id, channel_id: CHANNEL_ID },
      mentions: [alice],
      reactions: [
        {
          emoji: { id: null, name: '👍' },
          count: 3,
          me: false,
          me_burst: false,
          burst_colors: [],
          count_details: { burst: 0, normal: 3 },
        },
      ],
    }),
    message({ content: '```ts\nconst answer: number = 42;\n```' }),
    message({
      author: bot,
      embeds: [
        {
          title: 'An embed',
          description: 'With a **description** and a [link](https://example.com).',
          color: 0x5865f2,
          fields: [
            { name: 'Inline', value: 'one', inline: true },
            { name: 'Inline', value: 'two', inline: true },
            { name: 'Block', value: 'three' },
          ],
          footer: { text: 'Footer' },
          timestamp: '2026-11-20T10:00:00.000Z',
        },
      ],
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 1, label: 'Primary', custom_id: 'a' },
            { type: 2, style: 5, label: 'Link', url: 'https://example.com' },
          ],
        },
        { type: 1, components: [{ type: 5, custom_id: 'users', placeholder: 'Pick a user' }] },
      ],
    } as Partial<APIMessage>),
    message({
      author: bot,
      flags: 1 << 15,
      components: [
        {
          type: 17,
          accent_color: 0x57f287,
          components: [
            { type: 10, content: '## Components v2\nA container with text and a gallery.' },
            { type: 14, divider: true, spacing: 1 },
            {
              type: 12,
              items: [1, 2, 3].map((n) => ({
                media: {
                  url: `https://picsum.photos/seed/${n}/400/300`,
                  width: 400,
                  height: 300,
                  content_type: 'image/jpeg',
                },
              })),
            },
          ],
        },
      ],
    } as Partial<APIMessage>),
    message({
      attachments: [1, 2].map((n) => ({
        id: `50000000000000000${n}`,
        filename: `image-${n}.jpg`,
        size: 20480,
        url: `https://picsum.photos/seed/a${n}/640/480`,
        proxy_url: `https://picsum.photos/seed/a${n}/640/480`,
        width: 640,
        height: 480,
        content_type: 'image/jpeg',
      })),
    }),
    message({ type: 6, content: '', message_reference: { message_id: first.id, channel_id: CHANNEL_ID } }),
    // Things that tend to break narrow layouts.
    message({
      author: bob,
      content:
        'https://example.com/a/very/long/url/without/any/spaces/that/keeps/going/and/going/forever?query=1&other=2\n' +
        'Averyveryveryveryveryveryveryveryveryveryverylongwordwithoutbreaks\n' +
        '```js\nconst aVeryLongLineOfCode = someFunction(withMany, argumentsThat, doNotFit, onASmallPhoneScreen, atAll);\n```',
      embeds: [
        {
          title: 'An embed with an image and a long title that will need to wrap on small screens',
          description: 'Description',
          image: { url: 'https://picsum.photos/seed/wide/1200/400', width: 1200, height: 400 },
          thumbnail: { url: 'https://picsum.photos/seed/thumb/200/200', width: 200, height: 200 },
          color: 0xfee75c,
        },
      ],
      attachments: [
        {
          id: '600000000000000001',
          filename: 'a-file-with-a-rather-long-name-that-goes-on.zip',
          size: 123456789,
          url: 'https://example.com/file.zip',
          proxy_url: 'https://example.com/file.zip',
          content_type: 'application/zip',
        },
        {
          id: '600000000000000002',
          filename: 'voice-memo.mp3',
          size: 512000,
          url: 'https://example.com/voice.mp3',
          proxy_url: 'https://example.com/voice.mp3',
          content_type: 'audio/mpeg',
        },
      ],
      components: [
        {
          type: 1,
          components: ['First', 'Second', 'Third', 'Fourth', 'Fifth'].map((label, i) => ({
            type: 2,
            style: (i % 4) + 1,
            label: `${label} button`,
            custom_id: label,
          })),
        },
      ],
    } as Partial<APIMessage>),
  ];
}

async function main(): Promise<void> {
  const messages = Array.from({ length: repeat }, sampleMessages).flat();
  const adapter = fakeAdapter(messages, {
    [alice.id]: { nick: 'Alice (nick)', roles: [moderator.id] },
    [bob.id]: { roles: [] },
  });
  // SAMPLE_CDN points the page at a local core build, to check unreleased component changes.
  const transcripts = createTranscripts(adapter, { render: { cdn: process.env.SAMPLE_CDN } });

  let started = performance.now();
  const transcript = await transcripts.fetch(CHANNEL_ID, { filePreviews: false });
  console.log(
    `fetch: ${messages.length} messages, ${adapter.calls.length} API calls, ${(performance.now() - started).toFixed(0)}ms`
  );

  await mkdir(outDir, { recursive: true });

  started = performance.now();
  const client = transcripts.render(transcript);
  console.log(`client: ${(client.length / 1024).toFixed(0)}KB in ${(performance.now() - started).toFixed(0)}ms`);
  await writeFile(join(outDir, 'client.html'), client);

  started = performance.now();
  const server = await transcripts.render(transcript, { mode: 'server' });
  console.log(`server: ${(server.length / 1024).toFixed(0)}KB in ${(performance.now() - started).toFixed(0)}ms`);
  await writeFile(join(outDir, 'server.html'), server);

  await writeFile(join(outDir, 'transcript.json'), JSON.stringify(transcript, null, 2));
}

void main();
