import type { MenuBarDefinition } from '../../components/menubar.component';

export const PLAY_MENU_DEFINITION: MenuBarDefinition = {
  items: [
    {
      label: 'Script',
      path: '../script',
      icon: 'script',
    },
    {
      label: 'Staging notes',
      path: '../staging-directions',
      icon: 'staging',
    },
    {
      label: 'Blocking',
      path: '../blocking',
      icon: 'blocking',
    },
    {
      label: 'Memorization',
      path: '../memorize',
      icon: 'memorize',
    },
    {
      label: 'Planning',
      path: '../planning',
      icon: 'planning',
    },
    {
      label: 'Settings',
      path: '../settings',
      icon: 'settings',
    },
  ],
};
