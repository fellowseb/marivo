import type { MenuBarDefinition } from '../../components/menubar.component';

export const PLAY_MENU_DEFINITION: MenuBarDefinition = {
  items: [
    {
      label: 'Script',
      path: '../script',
      icon: 'script',
      accessPermission: 'scriptRead',
    },
    {
      label: 'Staging notes',
      path: '../staging-notes',
      icon: 'staging',
      accessPermission: 'stagingNotesRead',
    },
    {
      label: 'Blocking',
      path: '../blocking',
      icon: 'blocking',
      accessPermission: 'blockingRead',
    },
    {
      label: 'Memorization',
      path: '../memorize',
      icon: 'memorize',
      accessPermission: 'memorizeRead',
    },
    {
      label: 'Planning',
      path: '../planning',
      icon: 'planning',
      accessPermission: 'planningRead',
    },
    {
      label: 'Settings',
      path: '../settings',
      icon: 'settings',
      accessPermission: 'settingsRead',
    },
  ],
};
