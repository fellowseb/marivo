import { v4 as uuidv4 } from 'uuid';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '../../trpc';

interface ImportScriptMetadata {
  title: string;
  author: string;
  language: string;
  number_of_roles: number;
  number_of_male_roles: number;
  number_of_female_roles: number;
  genre?: string | undefined;
  period?: string | undefined;
  suggestions?: Record<string, string>;
}

type Step =
  | {
      name: 'import';
      importId: string;
      processing: boolean;
    }
  | { name: 'preview'; importId: string; metadata: ImportScriptMetadata }
  | { name: 'name'; importId: string; metadata: ImportScriptMetadata };

interface ImportScriptContext {
  step: Step | undefined;
  importId: string;
  startOver: () => void;
  reviewDone: () => void;
  backToReview: () => void;
}

const ImportScriptContext = createContext<ImportScriptContext | undefined>(
  undefined,
);

export function ImportScriptContextProvider(props: PropsWithChildren) {
  const trpc = useTRPC();
  const [searchParams] = useSearchParams();
  const resumeImportId = searchParams.get('resume');
  const [importId, setImportId] = useState(resumeImportId ?? uuidv4());
  const [step, setStep] = useState<Step | undefined>(
    resumeImportId
      ? undefined
      : {
          name: 'import',
          importId,
          processing: false,
        },
  );
  const statusQry = trpc.plays.importScriptStatus.queryOptions({
    importId,
  });
  statusQry.enabled = () => {
    return Boolean(importId && step?.name !== 'import');
  };
  statusQry.refetchInterval = 5000;
  const { status: statusStatus, data: statusData } = useQuery(statusQry);
  useEffect(() => {
    if (statusStatus === 'success' && statusData.id === importId) {
      switch (statusData.status) {
        case 'processing_files':
        case 'uploading_files':
          setStep((prev) => {
            if (
              prev &&
              (prev.name !== 'import' ||
                !prev.processing ||
                prev.importId !== importId)
            ) {
              return {
                name: 'import',
                importId,
                processing: true,
              };
            }
          });
          break;
        case 'reviewing':
          setStep((prev) => {
            if (
              !prev ||
              (prev &&
                (prev.name !== 'preview' ||
                  prev.metadata !== statusData.metadata ||
                  prev.importId !== importId))
            ) {
              return {
                name: 'preview',
                importId,
                metadata: statusData.metadata,
              };
            }
          });
          break;
      }
    }
  }, [statusStatus, statusData]);
  const startOver = useCallback(() => {
    const newImportId = uuidv4();
    setImportId(newImportId);
    setStep({
      name: 'import',
      importId: newImportId,
      processing: false,
    });
  }, []);
  const reviewDone = useCallback(() => {
    setStep((prev) => {
      if (prev?.name !== 'preview') {
        return prev;
      }
      return {
        name: 'name',
        importId,
        metadata: prev.metadata,
      };
    });
  }, []);
  const backToReview = useCallback(() => {
    setStep((prev) => {
      if (prev?.name !== 'name') {
        return prev;
      }
      return {
        name: 'preview',
        importId,
        metadata: prev.metadata,
      };
    });
  }, []);

  const context = useMemo<ImportScriptContext>(
    () => ({
      step,
      importId,
      startOver,
      reviewDone,
      backToReview,
    }),
    [step],
  );
  return (
    <ImportScriptContext.Provider value={context}>
      {props.children}
    </ImportScriptContext.Provider>
  );
}

export function useImportScriptContext(): ImportScriptContext {
  const context = useContext(ImportScriptContext);
  if (!context) {
    throw new Error('No import script context');
  }
  return context;
}
