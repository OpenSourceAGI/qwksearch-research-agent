import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { TooltipProvider } from '../src/ui/tooltip';
import './preview.css';

/**
 * Global Storybook preview config.
 *
 * - Adds a light/dark toolbar toggle that flips the `.dark` class on the
 *   preview root, exercising both palettes defined in `preview.css`.
 * - Wraps every story in a Radix `TooltipProvider` so components that use
 *   tooltips (copy / edit buttons, citations) work in isolation.
 */
const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? 'light';
      const isDark = theme === 'dark';
      return (
        <div
          className={isDark ? 'dark' : ''}
          style={{
            background: 'var(--background)',
            color: 'var(--foreground)',
            padding: '2rem',
            width: '100%',
            minHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TooltipProvider>
            <Story />
          </TooltipProvider>
        </div>
      );
    },
  ],
};

export default preview;
