import type { Preview } from '@storybook/react-vite';

import '../src/demo.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true, sort: 'requiredFirst' },
    options: {
      storySort: { order: ['Introduction', 'Grid', 'Admin', 'Player'] },
    },
  },
  tags: ['autodocs'],
};

export default preview;
