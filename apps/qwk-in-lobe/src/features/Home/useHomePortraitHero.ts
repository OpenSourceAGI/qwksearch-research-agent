import { DEFAULT_INBOX_AVATAR } from '@lobechat/const';

import { CHIEF_AGENT_ARTWORKS, DEFAULT_CHIEF_AGENT_ARTWORK } from '@/features/ChiefAgent/artwork';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';

import { useResolvedHomeAgentId } from './AgentSelect/useResolvedHomeAgentId';

/**
 * The full-body artwork Home shows for an agent, or `undefined` for none.
 *
 * The default "lobe" character is deliberately never shown on Home: it moved
 * to the QwkSearch homepage. So the catalog only answers for an avatar that is
 * one of its *other* characters, and an agent with no artwork of its own (the
 * Inbox Agent on its default avatar, an emoji avatar, a custom upload) gets no
 * portrait at all rather than falling back to the default character.
 */
export const resolveHomePortraitHero = ({
  avatar,
  fullBodyArtwork,
}: {
  avatar?: string;
  fullBodyArtwork?: string;
}): string | undefined => {
  // An agent that has been through the artwork studio shows its own character.
  if (fullBodyArtwork) return fullBodyArtwork;

  const match = CHIEF_AGENT_ARTWORKS.find(
    (item) => item.avatar === (avatar || DEFAULT_INBOX_AVATAR),
  );
  if (!match || match.id === DEFAULT_CHIEF_AGENT_ARTWORK.id) return undefined;

  return match.hero;
};

/**
 * The portrait artwork for whoever Home is addressing. It follows the same
 * selection the composer sends to — not the Inbox Agent it defaults to.
 * `enabled` is false while the portrait cannot show (signed out, or switched
 * off), so Home fetches no agent config just to draw nothing.
 */
export const useHomePortraitHero = (enabled: boolean): string | undefined => {
  const { agentId } = useResolvedHomeAgentId();
  const useFetchAgentConfig = useAgentStore((s) => s.useFetchAgentConfig);
  // A freshly picked agent may not be in the store yet; without this the
  // portrait would silently stay on the previous one's artwork.
  useFetchAgentConfig(enabled, agentId ?? '');

  const meta = useAgentStore(agentSelectors.getAgentMetaById(agentId ?? ''));
  const fullBodyArtwork = useAgentStore(agentSelectors.getAgentFullBodyArtworkById(agentId ?? ''));

  return resolveHomePortraitHero({ avatar: meta.avatar, fullBodyArtwork });
};
