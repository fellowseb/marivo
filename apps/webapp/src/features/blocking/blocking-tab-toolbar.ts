import type { ToolbarDefinition } from '../../components/toolbar.component';

export const BLOCKING_TOOLBAR: ToolbarDefinition = {
  items: [
    {
      label: 'undo',
      icon: 'undo',
      id: 'blocking-undo',
      disabled: false,
      onAction: () => {},
    },
    {
      label: 'redo',
      icon: 'redo',
      id: 'blocking-redo',
      disabled: false,
      onAction: () => {},
    },
    {
      label: 'search',
      icon: 'search',
      id: 'blocking-search',
      disabled: false,
      onAction: () => {},
    },
  ],
};
