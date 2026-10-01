import type { Preview } from '@storybook/react-vite';

import '../components/demo/demo.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true, sort: 'requiredFirst' },
    options: {
      storySort: { order: ['Introduction', 'Grid', 'Admin', 'Player'] },
    },
  },
  // The demo's styles are scoped to `.eyt-demo` so they cannot leak into the
  // docs around `/demo`; stories get the same wrapper.
  decorators: [
    (Story) => (
      <div className="eyt-demo">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default preview;
