import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Citation from './WebCitationBadge';
import { ExtractPanelProvider } from '../ArticleReader/ExtractPanelContext';
import { mockSources } from '../../stories/mocks';

/**
 * `WebCitationBadge` (Citation) is the inline, numbered citation chip rendered
 * from `<citation>` tags in AI responses. Hovering shows the source title and
 * favicon; clicking opens the source in the article extract panel (mocked here
 * via `ExtractPanelProvider`).
 */
const meta: Meta<typeof Citation> = {
  title: 'SearchResults/WebCitationBadge',
  component: Citation,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <ExtractPanelProvider>
        <p className="max-w-md text-sm leading-relaxed">
          Solid-state cells improve safety and energy density
          <Story />, with pilot lines targeted for 2027.
        </p>
      </ExtractPanelProvider>
    ),
  ],
  args: {
    href: mockSources[0].metadata.url as string,
    children: '1',
    sources: mockSources as any,
  },
};

export default meta;
type Story = StoryObj<typeof Citation>;

/** Resolves to a known source: hover shows its title + domain. */
export const KnownSource: Story = {};

/** No matching source: the tooltip falls back to the domain only. */
export const UnknownSource: Story = {
  args: {
    href: 'https://unlisted.example.com/article',
    children: '9',
  },
};
