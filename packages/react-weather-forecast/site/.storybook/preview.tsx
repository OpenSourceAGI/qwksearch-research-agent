import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true, sort: 'requiredFirst' },
    options: {
      storySort: { order: ['Introduction', 'WeatherForecast', ['Variants', 'Live'], 'WeatherIcon', 'useWeatherForecast'] },
    },
  },
  tags: ['autodocs'],
};

export default preview;
