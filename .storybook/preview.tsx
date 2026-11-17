import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '../src/styles/index.css';

const preview: Preview = {
  // Theme switch in the toolbar: every story can be checked in light and dark.
  globalTypes: {
    theme: {
      description: 'Tema',
      toolbar: {
        title: 'Tema',
        icon: 'mirror',
        items: [
          { value: 'dark', title: 'Escuro' },
          { value: 'light', title: 'Claro' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;
      useEffect(() => {
        document.documentElement.dataset.theme = theme;
      }, [theme]);
      return (
        <div className="bg-bg p-6 text-fg">
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { matchers: { color: /(background|color)$/i } },
    // Accessibility checks (axe) run on every story; violations fail the check.
    a11y: { test: 'error' },
  },
};

export default preview;
