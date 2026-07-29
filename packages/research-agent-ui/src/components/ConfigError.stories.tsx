/**
 * @fileoverview Storybook stories for the ConfigError component's default full-screen setup guide.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ConfigError from './ConfigError';

/**
 * `ConfigError` is the full-screen setup guide shown when no AI providers are
 * configured. It lists the environment variables the host app needs.
 */
const meta: Meta<typeof ConfigError> = {
  title: 'Misc/ConfigError',
  component: ConfigError,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ConfigError>;

export const Default: Story = {};
