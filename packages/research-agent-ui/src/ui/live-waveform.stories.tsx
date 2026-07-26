import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiveWaveform } from './live-waveform';

/**
 * `LiveWaveform` renders an animated audio bar visualizer on a canvas. The
 * `processing` mode animates a synthetic wave with no microphone access, so it
 * is safe to demo in Storybook. The `active` mode requests microphone
 * permission at runtime and is not exercised here.
 */
const meta: Meta<typeof LiveWaveform> = {
  title: 'UI/LiveWaveform',
  component: LiveWaveform,
  parameters: { layout: 'padded' },
  argTypes: {
    barWidth: { control: { type: 'range', min: 1, max: 10, step: 1 } },
    barGap: { control: { type: 'range', min: 0, max: 8, step: 1 } },
    barRadius: { control: { type: 'range', min: 0, max: 6, step: 0.5 } },
    height: { control: { type: 'number' } },
  },
};

export default meta;
type Story = StoryObj<typeof LiveWaveform>;

/** Synthetic "thinking" animation — no mic required. */
export const Processing: Story = {
  args: {
    processing: true,
    height: 64,
    barColor: '#6366f1',
  },
  render: (args) => (
    <div className="w-80 text-primary">
      <LiveWaveform {...args} />
    </div>
  ),
};

/** Idle: nothing is drawn until `active` or `processing` is set. */
export const Idle: Story = {
  args: { height: 64 },
  render: (args) => (
    <div className="w-80 rounded-md border border-dashed border-border p-2">
      <LiveWaveform {...args} />
    </div>
  ),
};
