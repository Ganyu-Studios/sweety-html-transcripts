import type { APIReaction } from 'discord-api-types/v10';
import { parseDiscordEmoji } from '../../utils/utils';
import type { Child } from '../jsx';
import { h } from '../jsx';

export function Reactions({ reactions }: { reactions: APIReaction[] | undefined }): Child {
  if (!reactions || reactions.length === 0) return null;

  return (
    <discord-reactions slot="reactions">
      {reactions.map((reaction) => (
        <discord-reaction
          name={reaction.emoji.name ?? undefined}
          emoji={parseDiscordEmoji(reaction.emoji)}
          count={reaction.count}
        />
      ))}
    </discord-reactions>
  );
}
