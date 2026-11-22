/**
 * The part both bot generators share: read the settings from `.env`, fetch the channel, render it
 * and either send it back to the channel or write it to disk, timing each phase.
 */
import { writeFile } from 'node:fs/promises';
import type { LocaleName, RenderOptions, TranscriptAdapter } from '../../src';
import { createTranscripts } from '../../src';

export interface GeneratorSettings {
  channelId: string;
  limit: number;
  /** SSR=true renders on the server (mode: 'server'). */
  ssr: boolean;
  /** SEND_TRANSCRIPT_TEST=false writes OUTPUT instead of sending to the channel. */
  send: boolean;
  output: string;
  render: RenderOptions;
}

const flag = (value: string | undefined): boolean => value === 'true' || value === '1';

export function readSettings(): GeneratorSettings {
  const channelId = process.env.CHANNEL;
  if (!channelId) throw new Error('Set CHANNEL in .env (see .env.example).');

  const ssr = flag(process.env.SSR);

  return {
    channelId,
    limit: Number(process.env.LIMIT ?? 30),
    ssr,
    send: process.env.SEND_TRANSCRIPT_TEST !== 'false',
    output: process.env.OUTPUT ?? './index.html',
    render: {
      mode: ssr ? 'server' : 'client',
      theme: process.env.THEME === 'light' ? 'light' : 'dark',
      locale: (process.env.LOCALE as LocaleName | undefined) ?? 'en',
    },
  };
}

/** Wrap an adapter to count the API requests a transcript takes. */
function counting<A extends TranscriptAdapter<unknown>>(adapter: A): A & { calls: number } {
  const counted = Object.assign(Object.create(adapter) as A, { calls: 0 });
  counted.get = (route, query) => {
    counted.calls++;
    return adapter.get(route, query);
  };
  return counted;
}

/**
 * Run one transcript through the new API: fetch, render, then send or save.
 * @param adapter - The library adapter
 * @param sendFile - Sends the file the adapter made to the channel
 * @param log - Where to print progress
 */
export async function generate<A extends TranscriptAdapter<unknown>>(
  adapter: A,
  sendFile: (channelId: string, file: ReturnType<NonNullable<A['file']>>) => Promise<unknown>,
  log: (message: string) => void = console.info
): Promise<void> {
  const settings = readSettings();
  const counted = counting(adapter);
  const transcripts = createTranscripts(counted);

  log(`Fetching up to ${settings.limit} messages from ${settings.channelId}…`);
  let started = performance.now();
  const transcript = await transcripts.fetch(settings.channelId, { limit: settings.limit });
  log(
    `Fetched ${transcript.messages.length} messages with ${counted.calls} API calls in ${(performance.now() - started).toFixed(0)}ms`
  );

  started = performance.now();
  const html = await transcripts.render(transcript, settings.render);
  log(
    `Rendered (${settings.ssr ? 'server' : 'client'} mode) ${(html.length / 1024).toFixed(0)}KB in ${(performance.now() - started).toFixed(0)}ms`
  );

  if (settings.send) {
    const file = adapter.file!(Buffer.from(html), `transcript-${settings.channelId}.html`);
    await sendFile(settings.channelId, file as ReturnType<NonNullable<A['file']>>);
    log(`Sent to channel ${settings.channelId}`);
  } else {
    await writeFile(settings.output, html);
    log(`Saved to ${settings.output}`);
  }
}
