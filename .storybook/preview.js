/** @type {import('@storybook/html-vite').Preview} */
export default {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#14161c' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};
