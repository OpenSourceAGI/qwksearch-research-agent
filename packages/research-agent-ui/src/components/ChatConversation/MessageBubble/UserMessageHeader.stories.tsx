/**
 * @fileoverview Storybook stories for the UserMessageHeader component covering the default, long-question, and copied-state variants via an interactive controlled wrapper.
 */
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import UserMessageHeader from './UserMessageHeader';
import { mockSection } from '../../../stories/mocks';
import type { Section } from '../../../types/chat';

/**
 * `UserMessageHeader` renders the user's question as a collapsible heading with
 * a timestamp (e.g. `12:29 PM`) and copy / edit-and-resubmit actions.
 *
 * The header is a controlled component, so the wrapper below wires up the
 * `isExpanded`, `isEditing`, `editText`, and `copiedUserMsg` state that the
 * parent `ChatMessageBubble` normally owns.
 */
const meta: Meta<typeof UserMessageHeader> = {
  title: 'Chat/UserMessageHeader',
  component: UserMessageHeader,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof UserMessageHeader>;

/** Interactive wrapper that manages the controlled state locally. */
const InteractiveHeader = ({ section }: { section: Section }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(section.userMessage.content);
  const [copiedUserMsg, setCopiedUserMsg] = useState(false);

  return (
    <div className="w-full max-w-3xl">
      <UserMessageHeader
        section={section}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        editText={editText}
        setEditText={setEditText}
        handleEditSubmit={() => setIsEditing(false)}
        copiedUserMsg={copiedUserMsg}
        handleCopyUserMsg={() => {
          setCopiedUserMsg(true);
          setTimeout(() => setCopiedUserMsg(false), 1500);
        }}
      />
    </div>
  );
};

/** Default: expanded header with the 12:29 PM timestamp, copy and edit icons. */
export const Default: Story = {
  render: () => <InteractiveHeader section={mockSection} />,
};

/** Long question that wraps and clamps across lines. */
export const LongQuestion: Story = {
  render: () => (
    <InteractiveHeader
      section={{
        ...mockSection,
        userMessage: {
          ...mockSection.userMessage,
          content:
            'Can you give me a detailed comparison of solid-state, lithium-sulfur, ' +
            'and sodium-ion battery chemistries covering energy density, cycle life, ' +
            'cost trajectory, and expected timelines to commercial EV deployment?',
        },
      }}
    />
  ),
};

/** Copied state — the clipboard icon flips to a green check. */
export const CopiedState: Story = {
  render: () => {
    const Wrapper = () => {
      const [copied, setCopied] = useState(true);
      return (
        <div className="w-full max-w-3xl">
          <UserMessageHeader
            section={mockSection}
            isExpanded
            setIsExpanded={() => {}}
            isEditing={false}
            setIsEditing={() => {}}
            editText={mockSection.userMessage.content}
            setEditText={() => {}}
            handleEditSubmit={() => {}}
            copiedUserMsg={copied}
            handleCopyUserMsg={() => setCopied(true)}
          />
        </div>
      );
    };
    return <Wrapper />;
  },
};
