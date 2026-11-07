import superjson from "superjson";
import { v7 as uuidv7 } from "uuid";
import { StrictMode, useState } from "react";
import "keyboard-css/dist/css/main.min.css";
import { BrowserRouter } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpLink,
  isNonJsonSerializable,
  splitLink,
  TRPCClientError,
} from "@trpc/client";
import type { AppRouter } from "@marivo/api";
import Routes from "./routes.tsx";
import "./app.css";
import { TRPCProvider } from "./trpc.ts";
import { NotificationsContextProvider } from "./components/notifications.context.tsx";
import ErrorBoundary, { ErrorFallback } from "./components/error-boundary.component";
import { ThemeProvider } from "./features/theme/theme.context.tsx";
import { LanguageProvider } from "./features/language/language.context.tsx";
import i18n from "./i18n/i18n.ts";
import { I18nextProvider } from "react-i18next";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof TRPCClientError && error.data?.code === "NOT_FOUND") {
            return false;
          }
          return failureCount < 4;
        },
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

interface TrpcApiProviderProps {
  apiUrl: string;
}

function TrpcApiProvider(props: React.PropsWithChildren<TrpcApiProviderProps>) {
  const queryClient = getQueryClient();
  const { getToken } = useAuth();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        splitLink({
          condition: (op) => isNonJsonSerializable(op.input),
          true: httpLink({
            url: props.apiUrl,
            transformer: {
              // Avoid JSON-serializing file-like output data
              serialize: (data) => data,
              deserialize: superjson.deserialize,
            },
            headers: async (h) => {
              const token = await getToken();
              const { importId } = h.op.context;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const importFileId = (h.op.input as any).id;
              return {
                Authorization: `Bearer ${token}`,
                "x-marivo-request-id": uuidv7(),
                ...(importId && typeof importId === "string"
                  ? { "x-marivo-import-id": importId }
                  : {}),
                ...(importFileId && typeof importFileId === "string"
                  ? { "x-marivo-import-file-id": importFileId }
                  : {}),
              };
            },
          }),
          false: httpLink({
            url: props.apiUrl,
            transformer: superjson,
            headers: async () => {
              const token = await getToken();
              return {
                Authorization: `Bearer ${token}`,
                "x-marivo-request-id": uuidv7(),
              };
            },
          }),
        }),
      ],
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const API_URL = import.meta.env.VITE_MARIVO_TRPC_API_URL;
if (!API_URL) {
  throw new Error("Missing TRPC API url");
}

function App() {
  return (
    <StrictMode>
      {/* Root boundary: also isolates infra providers (Clerk, tRPC, query client) */}
      <ErrorBoundary fallback={<ErrorFallback />}>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <TrpcApiProvider apiUrl={API_URL}>
            <I18nextProvider i18n={i18n}>
              <ThemeProvider>
                <LanguageProvider>
                  <NotificationsContextProvider>
                    <BrowserRouter>
                      <Routes />
                    </BrowserRouter>
                  </NotificationsContextProvider>
                </LanguageProvider>
              </ThemeProvider>
            </I18nextProvider>
          </TrpcApiProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

export default App;
