import type { APIGuild, APIGuildMember, APIMessage, APIRole, APIUser } from 'discord-api-types/v10';
import type { Query, TranscriptAdapter } from '../src';

export const GUILD_ID = '100000000000000001';
export const CHANNEL_ID = '100000000000000002';

export const alice: APIUser = {
  id: '200000000000000001',
  username: 'alice',
  discriminator: '0',
  global_name: 'Alice',
  avatar: null,
};
export const bob: APIUser = {
  id: '200000000000000002',
  username: 'bob',
  discriminator: '0',
  global_name: null,
  avatar: null,
};
export const bot: APIUser = {
  id: '200000000000000003',
  username: 'helper',
  discriminator: '0',
  global_name: null,
  avatar: null,
  bot: true,
};

export const moderator = {
  id: '300000000000000001',
  name: 'Moderator',
  color: 0xff0000,
  colors: { primary_color: 0xff0000, secondary_color: null, tertiary_color: null },
  position: 2,
  hoist: true,
  icon: null,
  unicode_emoji: null,
  managed: false,
  mentionable: true,
  permissions: '0',
  flags: 0,
} as unknown as APIRole;

export const guild = {
  id: GUILD_ID,
  name: 'Test Guild',
  icon: null,
  roles: [{ ...moderator, id: GUILD_ID, name: '@everyone', color: 0, position: 0 }, moderator],
} as unknown as APIGuild;

export const channel = { id: CHANNEL_ID, type: 0, guild_id: GUILD_ID, name: 'general', topic: null };

let nextId = 400000000000000000n;

/** A raw API message with sensible defaults. */
export function message(overrides: Partial<APIMessage> = {}): APIMessage {
  nextId += 1n;
  return {
    id: String(nextId),
    channel_id: CHANNEL_ID,
    author: alice,
    content: '',
    timestamp: '2026-11-20T10:00:00.000Z',
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: 0,
    ...overrides,
  } as APIMessage;
}

/**
 * An adapter that serves routes from memory and records every request, so tests can assert on both
 * the output and how many API calls it took.
 */
export function fakeAdapter(messages: APIMessage[], members: Record<string, Partial<APIGuildMember>> = {}) {
  const calls: string[] = [];
  const newestFirst = [...messages].sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1));

  const routes: [RegExp, (match: RegExpMatchArray, query?: Query) => unknown][] = [
    [new RegExp(`^/channels/${CHANNEL_ID}$`), () => channel],
    [
      new RegExp(`^/channels/${CHANNEL_ID}/messages$`),
      (_, query) => {
        const before = query?.before ? BigInt(String(query.before)) : undefined;
        const limit = Number(query?.limit ?? 50);
        return newestFirst.filter((item) => before === undefined || BigInt(item.id) < before).slice(0, limit);
      },
    ],
    [new RegExp(`^/guilds/${GUILD_ID}$`), () => guild],
    [new RegExp(`^/guilds/${GUILD_ID}/channels$`), () => [channel]],
    [
      new RegExp(`^/guilds/${GUILD_ID}/members/(\\d+)$`),
      (match) => {
        const member = members[match[1]!];
        if (!member) throw new Error('404 Unknown Member');
        return { roles: [], joined_at: '2026-01-01T00:00:00.000Z', deaf: false, mute: false, ...member };
      },
    ],
    [
      /^\/users\/(\d+)$/,
      (match) => [alice, bob, bot].find((user) => user.id === match[1]) ?? Promise.reject(new Error('404')),
    ],
  ];

  const adapter: TranscriptAdapter<{ data: Buffer; name: string }> & { calls: string[] } = {
    calls,
    async get<T>(route: `/${string}`, query?: Query): Promise<T> {
      calls.push(route);
      for (const [pattern, handler] of routes) {
        const match = route.match(pattern);
        if (match) return (await handler(match, query)) as T;
      }
      throw new Error(`404 ${route}`);
    },
    file: (data, name) => ({ data, name }),
  };

  return adapter;
}
