import { ChannelType } from 'discord-api-types/v10';
import type { RuleTypesExtended } from 'discord-markdown-parser';
import type { ASTNode, SingleASTNode } from 'simple-markdown';
import type { Child } from '../jsx';
import { Fragment, h } from '../jsx';
import { parseWithLists } from '../../utils/markdown';
import { parseDiscordEmoji, toHex } from '../../utils/utils';
import type { RenderContext } from '../context';

export enum ContentKind {
  Normal,
  Embed,
  /** One-line previews (replies, thread previews): no blocks, no line breaks. */
  Reply,
}

interface ContentState {
  kind: ContentKind;
  jumbo: boolean;
}

/**
 * Render Discord markdown.
 * @param content - The raw text
 */
export function Content({ ctx, content, kind }: { ctx: RenderContext; content: string; kind: ContentKind }): Child {
  if (kind === ContentKind.Reply && content.length > 180) content = `${content.slice(0, 180)}...`;

  const nodes = parseWithLists(content);

  // Only emojis (and whitespace), up to 25 of them, renders them big.
  const emojis = nodes.filter((node) => node.type === 'emoji' || node.type === 'twemoji').length;
  const onlyEmojis = nodes.every(
    (node) =>
      node.type === 'emoji' ||
      node.type === 'twemoji' ||
      (node.type === 'text' && String(node.content).trim().length === 0)
  );

  return renderNodes(ctx, nodes, { kind, jumbo: kind !== ContentKind.Reply && onlyEmojis && emojis <= 25 });
}

function renderNodes(ctx: RenderContext, nodes: ASTNode, state: ContentState): Child {
  return Array.isArray(nodes) ? nodes.map((node) => renderNode(ctx, node, state)) : renderNode(ctx, nodes, state);
}

export function renderNode(ctx: RenderContext, node: SingleASTNode, state: ContentState): Child {
  if (!node) return null;

  const inner = (): Child => renderNodes(ctx, node.content as ASTNode, state);
  const reply = state.kind === ContentKind.Reply;

  switch (node.type as RuleTypesExtended) {
    case 'text':
      return node.content as string;

    case 'link':
      return <discord-link href={node.target}>{inner()}</discord-link>;

    case 'url':
    case 'autolink':
      return (
        <discord-link href={node.target} target="_blank" rel="noreferrer">
          {inner()}
        </discord-link>
      );

    case 'blockQuote':
      return reply ? inner() : <discord-quote>{inner()}</discord-quote>;

    case 'br':
    case 'newline':
      return reply ? ' ' : <br />;

    case 'channel': {
      const channel = ctx.transcript.channels[node.id as string];
      const name =
        channel?.type === ChannelType.DM || channel?.type === ChannelType.GroupDM
          ? ctx.locale.directMessages
          : (channel?.name ?? `<#${node.id}>`);

      return <discord-mention type={channel ? mentionChannelType(channel.type) : 'channel'}>{name}</discord-mention>;
    }

    case 'role': {
      const role = ctx.transcript.roles[node.id as string];
      return (
        <discord-mention type="role" color={reply ? undefined : toHex(role?.colors?.primary_color ?? role?.color)}>
          {role ? role.name : `<@&${node.id}>`}
        </discord-mention>
      );
    }

    case 'user': {
      const user = ctx.user(node.id as string);
      return <discord-mention type="user">{user ? ctx.displayName(user) : `<@${node.id}>`}</discord-mention>;
    }

    case 'here':
    case 'everyone':
      return (
        <discord-mention type="role" highlight>
          {`@${node.type}`}
        </discord-mention>
      );

    case 'heading':
      // The heading's line break is consumed by the heading rule, so a reply needs the space back.
      return reply ? [inner(), ' '] : <discord-header level={node.level}>{inner()}</discord-header>;

    case 'codeBlock':
      return reply ? (
        <discord-code multiline>{node.content as string}</discord-code>
      ) : (
        <discord-code-block language={node.lang} code={node.content as string} />
      );

    case 'inlineCode':
      return <discord-code>{node.content as string}</discord-code>;

    case 'em':
      return <discord-italic>{inner()}</discord-italic>;

    case 'strong':
      return <discord-bold>{inner()}</discord-bold>;

    case 'underline':
      return <discord-underlined>{inner()}</discord-underlined>;

    case 'strikethrough':
      return <s>{inner()}</s>;

    case 'emoticon':
      return typeof node.content === 'string' ? node.content : inner();

    case 'spoiler':
      return <discord-spoiler>{inner()}</discord-spoiler>;

    case 'emoji':
    case 'twemoji':
      return (
        <discord-custom-emoji
          name={node.name}
          url={parseDiscordEmoji(node as { id?: string; name?: string; animated?: boolean })}
          embed-emoji={state.kind === ContentKind.Embed}
          jumbo={state.jumbo}
        />
      );

    case 'subtext':
      return reply ? inner() : <discord-subscript>{inner()}</discord-subscript>;

    case 'timestamp':
      return <discord-time timestamp={parseInt(node.timestamp as string, 10)} format={node.format} />;

    case 'list': {
      const items = node.items as ASTNode[];

      // A reply preview is a single line, so items are joined with spaces.
      // The leading space separates a nested list from the item text it hangs off.
      if (reply) return [' ', items.map((item) => [renderNodes(ctx, item, state), ' '])];

      const children = items.map((item) => <discord-list-item>{renderNodes(ctx, item, state)}</discord-list-item>);

      return node.ordered ? (
        <discord-ordered-list start={node.start ?? 1}>{children}</discord-ordered-list>
      ) : (
        <discord-unordered-list nested={Boolean(node.nested)}>{children}</discord-unordered-list>
      );
    }

    default:
      return typeof node.content === 'string' ? node.content : <>{inner()}</>;
  }
}

export function mentionChannelType(type: ChannelType): 'channel' | 'voice' | 'thread' | 'forum' {
  switch (type) {
    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice:
      return 'voice';
    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
    case ChannelType.AnnouncementThread:
      return 'thread';
    case ChannelType.GuildForum:
    case ChannelType.GuildMedia:
      return 'forum';
    default:
      return 'channel';
  }
}
