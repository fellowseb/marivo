import Toolbar from '../../components/toolbar.component';
import { useScriptTabToolbarContext } from '../script-edition/script-tab-toolbar.context.tsx';

export function ImportScriptPreviewToolbar() {
  const { setShowNavigatePanel, setShowSearchPanel, setShowCharactersPanel } =
    useScriptTabToolbarContext();
  return (
    <Toolbar
      definition={{
        items: [
          {
            id: 'script-search',
            label: 'search',
            icon: 'search',
            disabled: false,
            onAction: () => {
              setShowSearchPanel((prev) => !prev);
            },
          },
          {
            id: 'script-navigate',
            label: 'navigate',
            icon: 'navigate',
            disabled: false,
            onAction: () => {
              setShowNavigatePanel((prev) => !prev);
            },
          },
          {
            id: 'script-characters',
            label: 'characters',
            icon: 'characterLine',
            disabled: false,
            onAction: () => {
              setShowCharactersPanel((prev) => !prev);
            },
          },
        ],
      }}
    />
  );
}
