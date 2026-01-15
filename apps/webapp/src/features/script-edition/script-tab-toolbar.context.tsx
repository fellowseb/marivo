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
}

const ScriptTabToolbarContext = createContext<ScriptTabToolbarContext>({
  showSearchPanel: false,
  setShowSearchPanel: () => {},
});

export function ScriptTabToolbarContextProvider(props: PropsWithChildren) {
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  return (
    <ScriptTabToolbarContext.Provider
      value={{
        showSearchPanel,
        setShowSearchPanel,
      }}
    >
      {props.children}
    </ScriptTabToolbarContext.Provider>
  );
}

export function useScriptTabToolbarContext() {
  return useContext(ScriptTabToolbarContext);
}
