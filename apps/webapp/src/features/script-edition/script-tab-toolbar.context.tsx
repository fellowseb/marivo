import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';

interface ScriptTabToolbarContext {
  showSearchPanel: boolean;
  setShowSearchPanel: Dispatch<SetStateAction<boolean>>;
  showNavigatePanel: boolean;
  setShowNavigatePanel: Dispatch<SetStateAction<boolean>>;
  showCharactersPanel: boolean;
  setShowCharactersPanel: Dispatch<SetStateAction<boolean>>;
}

const ScriptTabToolbarContext = createContext<ScriptTabToolbarContext>({
  showSearchPanel: false,
  setShowSearchPanel: () => {},
  showNavigatePanel: false,
  setShowNavigatePanel: () => {},
  showCharactersPanel: false,
  setShowCharactersPanel: () => {},
});

export function ScriptTabToolbarContextProvider(props: PropsWithChildren) {
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showNavigatePanel, setShowNavigatePanel] = useState(false);
  const [showCharactersPanel, setShowCharactersPanel] = useState(false);
  return (
    <ScriptTabToolbarContext.Provider
      value={{
        showSearchPanel,
        setShowSearchPanel,
        showNavigatePanel,
        setShowNavigatePanel,
        showCharactersPanel,
        setShowCharactersPanel,
      }}
    >
      {props.children}
    </ScriptTabToolbarContext.Provider>
  );
}

export function useScriptTabToolbarContext() {
  return useContext(ScriptTabToolbarContext);
}
